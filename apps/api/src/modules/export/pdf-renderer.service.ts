import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { Browser } from "playwright";

const PDF_TIMEOUT_MS = 30_000;

// Launches one Chromium per worker process and reuses it, opening a fresh
// browser context per render job.
@Injectable()
export class PdfRendererService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfRendererService.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) return this.browser;
    if (this.launching) return this.launching;
    this.launching = this.launch();
    this.browser = await this.launching;
    this.launching = null;
    return this.browser;
  }

  private async launch(): Promise<Browser> {
    // Import lazily so environments without Playwright installed can still boot
    // the API (PDF rendering just fails at job time instead).
    const { chromium } = await import("playwright");
    const poolNote = process.env.EXPORT_BROWSER_POOL_SIZE ?? "1";
    this.logger.log(`Launching Chromium (pool size hint: ${poolNote})`);
    return chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  }

  async renderPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setContent(html, {
        waitUntil: "networkidle",
        timeout: PDF_TIMEOUT_MS,
      });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        displayHeaderFooter: true,
        timeout: PDF_TIMEOUT_MS,
      });
      return Buffer.from(pdf);
    } finally {
      await context.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.browser?.close().catch(() => undefined);
  }
}

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

const geist = localFont({ src: "../../public/fonts/geist-latin-variable.woff2", variable: "--font-geist", display: "swap", weight: "100 900" });
const jetbrains = localFont({ src: "../../public/fonts/jetbrains-mono-latin-variable.woff2", variable: "--font-jetbrains", display: "swap", weight: "100 800" });

export const metadata: Metadata = {
  title: "SkyVision — Security research workspace",
  description: "One workspace for your security research, findings, targets, and disclosure workflow.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geist.variable + " " + jetbrains.variable}>
        <Providers>{children}</Providers>
        <div className="film-grain" aria-hidden="true" />
      </body>
    </html>
  );
}

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ENV_TOKEN, type Env } from "../../config/env";

// AES-256-GCM helpers. Payload format: "v1:<iv b64>:<tag b64>:<ct b64>"
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(@Inject(ENV_TOKEN) env: Env) {
    this.key = Buffer.from(env.MASTER_KEY, "base64");
    if (this.key.length !== 32) {
      throw new Error("MASTER_KEY must decode to exactly 32 bytes");
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ct = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString(
      "base64",
    )}`;
  }

  decrypt(payload: string): string {
    const parts = payload.split(":");
    if (parts.length !== 4 || parts[0] !== "v1") {
      throw new Error("Invalid ciphertext payload format");
    }
    const [, ivB64, tagB64, ctB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const ct = Buffer.from(ctB64, "base64");
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8");
  }
}

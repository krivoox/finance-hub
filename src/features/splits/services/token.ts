import { randomBytes } from "node:crypto";

export function generatePublicShareToken(): string {
  return randomBytes(32).toString("base64url");
}

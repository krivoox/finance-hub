/** Client-safe invite URL builder (base URL comes from the server). */
export function buildInviteUrlClient(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/invitaciones/${token}`;
}

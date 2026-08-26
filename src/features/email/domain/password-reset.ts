import { MissingResetUrlError } from "./errors";
import { escapeHtml } from "./html";
import { EMAIL_KIND, EMAIL_TEMPLATE } from "./kinds";

export const PASSWORD_RESET_EXPIRES_HOURS = 1;

export type PasswordResetEmailInput = {
  email: string;
  resetUrl: string;
  displayName?: string | null;
  expiresInHours?: number;
};

export type RenderedEmail = {
  kind: typeof EMAIL_KIND.transactional;
  template: typeof EMAIL_TEMPLATE.passwordReset;
  subject: string;
  preview: string;
  html: string;
  text: string;
};

function greetingName(
  displayName: string | null | undefined,
  email: string,
): string {
  const name = displayName?.trim();
  return name && name.length > 0 ? name : email;
}

export function buildPasswordResetEmail(
  input: PasswordResetEmailInput,
): RenderedEmail {
  const resetUrl = input.resetUrl.trim();
  if (!resetUrl || !/^https?:\/\//i.test(resetUrl)) {
    throw new MissingResetUrlError();
  }

  const hours = input.expiresInHours ?? PASSWORD_RESET_EXPIRES_HOURS;
  const hourLabel = hours === 1 ? "1 hora" : `${hours} horas`;
  const name = greetingName(input.displayName, input.email);

  const subject = "Restablecé tu contraseña de Finance Hub";
  const preview = `El enlace vence en ${hourLabel}. Si no lo pediste, ignorá este correo.`;

  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f1ea;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;color:#1a1a1a;">
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;padding:32px 28px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.02em;">Finance Hub</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Restablecé tu contraseña</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.55;">Hola ${safeName}, recibimos un pedido para cambiar la contraseña de tu cuenta.</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.55;">El enlace vence en <strong>${hourLabel}</strong> y se puede usar una sola vez.</p>
                <p style="margin:0 0 28px;">
                  <a href="${safeUrl}" style="display:inline-block;background-color:#1a1a1a;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 22px;border-radius:999px;box-sizing:border-box;">Restablecer contraseña</a>
                </p>
                <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#5c5850;word-break:break-all;">Si el botón no funciona, copiá esta URL:<br />${safeUrl}</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#5c5850;">Si no pediste este cambio, ignorá este correo. Tu contraseña no se modifica hasta que completes el flujo.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "Finance Hub",
    "",
    `Hola ${name}, recibimos un pedido para cambiar la contraseña de tu cuenta.`,
    `El enlace vence en ${hourLabel} y se puede usar una sola vez.`,
    "",
    resetUrl,
    "",
    "Si no pediste este cambio, ignorá este correo. Tu contraseña no se modifica hasta que completes el flujo.",
  ].join("\n");

  return {
    kind: EMAIL_KIND.transactional,
    template: EMAIL_TEMPLATE.passwordReset,
    subject,
    preview,
    html,
    text,
  };
}

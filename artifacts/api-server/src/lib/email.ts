import { Resend } from "resend";
import { logger } from "./logger";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.FROM_EMAIL ?? "onboarding@resend.dev";
const APP_NAME = "Asset Manager";

export async function sendVerificationEmail(email: string, code: string, firstName: string): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#2563eb;padding:32px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${APP_NAME}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 24px">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Здравствуйте, <strong>${firstName}</strong>!</p>
            <p style="margin:0 0 32px;font-size:15px;color:#475569;line-height:1.6">
              Для подтверждения вашего email-адреса введите код ниже. Код действителен <strong>15 минут</strong>.
            </p>
            <div style="text-align:center;margin:0 0 32px">
              <div style="display:inline-block;background:#f1f5f9;border:2px dashed #2563eb;border-radius:12px;padding:20px 48px">
                <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#2563eb;font-family:monospace">${code}</span>
              </div>
            </div>
            <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center">
              Если вы не регистрировались в ${APP_NAME} — просто проигнорируйте это письмо.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
              © ${new Date().getFullYear()} ${APP_NAME}. Это автоматическое письмо — не отвечайте на него.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  if (!resend) {
    logger.warn({ email, code }, "RESEND_API_KEY not set — verification code logged only");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `${code} — код подтверждения ${APP_NAME}`,
    html,
  });

  if (error) {
    logger.error({ error, email }, "Failed to send verification email");
    throw new Error("Не удалось отправить письмо. Попробуйте позже.");
  }
}

interface PortalAccessOptions {
  email: string;
  firstName: string;
  password: string;
  loginUrl: string;
  portalLabel: string; // "покупателя", "арендатора", "подрядчика", "поставщика"
  companyName?: string;
}

export async function sendPortalAccessEmail(opts: PortalAccessOptions): Promise<{ sent: boolean; error?: string }> {
  const { email, firstName, password, loginUrl, portalLabel, companyName } = opts;
  const titleSuffix = companyName ? ` · ${companyName}` : "";
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#f97316;padding:32px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${APP_NAME}${titleSuffix}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 24px">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Здравствуйте, <strong>${firstName}</strong>!</p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6">
              Для вас создан личный кабинет <strong>${portalLabel}</strong>${companyName ? ` в системе компании <strong>${companyName}</strong>` : ""}. Войдите по данным ниже и при первой возможности смените пароль.
            </p>
            <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:10px;padding:20px;margin:0 0 24px">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#64748b">Логин (email):</td>
                <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;text-align:right">${email}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #e2e8f0">Пароль:</td>
                <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;border-top:1px solid #e2e8f0;font-family:monospace">${password}</td>
              </tr>
            </table>
            <div style="text-align:center;margin:0 0 28px">
              <a href="${loginUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600">
                Войти в кабинет
              </a>
            </div>
            <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;word-break:break-all">
              Или откройте: <a href="${loginUrl}" style="color:#f97316">${loginUrl}</a>
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
              Это автоматическое письмо. Не передавайте данные третьим лицам.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
              © ${new Date().getFullYear()} ${APP_NAME}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  if (!resend) {
    logger.warn({ email }, "RESEND_API_KEY not set — portal access email not sent");
    return { sent: false, error: "Email-сервис не настроен" };
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Доступ в личный кабинет — ${APP_NAME}`,
    html,
  });

  if (error) {
    logger.error({ error, email }, "Failed to send portal access email");
    return { sent: false, error: String((error as { message?: string }).message ?? error) };
  }

  return { sent: true };
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetLink: string,
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#2563eb;padding:32px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${APP_NAME}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 24px">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Здравствуйте, <strong>${firstName}</strong>!</p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6">
              Администратор запросил сброс пароля. Нажмите кнопку ниже и задайте новый пароль. Ссылка действует <strong>1 час</strong>.
            </p>
            <div style="text-align:center;margin:0 0 32px">
              <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600">
                Сбросить пароль
              </a>
            </div>
            <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;word-break:break-all">
              Или скопируйте ссылку:<br><a href="${resetLink}" style="color:#2563eb">${resetLink}</a>
            </p>
            <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center">
              Если вы не запрашивали сброс — проигнорируйте письмо.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
              © ${new Date().getFullYear()} ${APP_NAME}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  if (!resend) {
    logger.warn({ email, resetLink }, "RESEND_API_KEY not set — password reset link logged only");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Сброс пароля — ${APP_NAME}`,
    html,
  });

  if (error) {
    logger.error({ error, email }, "Failed to send password reset email");
    throw new Error("Не удалось отправить письмо. Попробуйте позже.");
  }
}

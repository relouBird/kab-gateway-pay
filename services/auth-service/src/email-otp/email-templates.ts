import type { OtpEmailLocale, OtpEmailPurpose } from './email-otp.types';
import { LOGO } from './email-template-logo';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const theme = {
  green: '#0B3D2E',
  sand: '#F6F1E7',
  card: '#FBF8F1',
  ink: '#141A17',
  muted: '#4B544F',
  border: '#D9D5CC',
  yellow: '#E8B84B',
} as const;

const purposeLabels: Record<OtpEmailPurpose, { en: string; fr: string }> = {
  contact_verification: {
    en: 'verify your email address',
    fr: 'vérifier votre adresse e-mail',
  },
  login: {
    en: 'sign in to your account',
    fr: 'vous connecter à votre compte',
  },
  password_recovery: {
    en: 'reset your password',
    fr: 'réinitialiser votre mot de passe',
  },
  step_up: {
    en: 'confirm a sensitive action',
    fr: 'confirmer une action sensible',
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emailLayout(
  locale: OtpEmailLocale,
  title: string,
  preheader: string,
  content: string,
): string {
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${theme.sand};color:${theme.ink};font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.sand};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
            <tr>
              <td style="background:${theme.green};padding:16px 0;border-radius:12px 12px 0 0;width:100%; display:flex; justify-content:center;">
                  <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="170"
                  height="58"
                  viewBox="0 0 720 245.7"
                  preserveAspectRatio="xMidYMid meet"
                  role="img"
                  aria-label="KG Pay"
                  style="display:block;width:140px;height:auto;max-width:100%;"
                >
                  ${LOGO}
                </svg>
              </td>
            </tr>
            <tr>
              <td style="background:${theme.card};padding:32px 28px;border:1px solid ${theme.border};border-top:0;border-radius:0 0 12px 12px;">
                <h1 style="margin:0 0 20px;color:${theme.green};font-size:24px;line-height:1.3;">${escapeHtml(title)}</h1>
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 8px;text-align:center;color:${theme.muted};font-size:13px;line-height:1.5;">
                Plusieurs sources. Un seul accès.<br>
                Ce message a été envoyé automatiquement par KG Pay.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;color:${theme.ink};font-size:16px;line-height:1.6;">${escapeHtml(text)}</p>`;
}

export function createOtpEmailTemplate(input: {
  code: string;
  purpose: OtpEmailPurpose;
  locale: OtpEmailLocale;
  expiresInMinutes: number;
}): RenderedEmail {
  const { code, purpose, locale, expiresInMinutes } = input;
  const label = purposeLabels[purpose][locale];
  const title =
    locale === 'fr' ? 'Votre code de sécurité' : 'Your security code';
  const subject =
    locale === 'fr'
      ? 'Votre code de sécurité KG Pay'
      : 'Your KG Pay security code';
  const instruction =
    locale === 'fr'
      ? `Utilisez ce code pour ${label}.`
      : `Use this code to ${label}.`;
  const expiry =
    locale === 'fr'
      ? `Ce code expire dans ${expiresInMinutes} minutes.`
      : `This code expires in ${expiresInMinutes} minutes.`;
  const ignore =
    locale === 'fr'
      ? "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail."
      : 'If you did not request this, you can ignore this email.';
  const safeCode = escapeHtml(code);
  const htmlContent = `
                ${paragraph(instruction)}
                <p style="margin:0 0 18px;padding:18px;border:1px solid ${theme.border};border-radius:8px;background:#FFFFFF;color:${theme.green};font-family:monospace;font-size:30px;font-weight:700;letter-spacing:.2em;text-align:center;">${safeCode}</p>
                ${paragraph(expiry)}
                <p style="margin:0;color:${theme.muted};font-size:14px;line-height:1.6;">${escapeHtml(ignore)}</p>`;

  return {
    subject,
    text: `KG Pay\n\n${instruction}\n\n${code}\n\n${expiry} ${ignore}`,
    html: emailLayout(locale, title, instruction, htmlContent),
  };
}

export function createInvitationEmailTemplate(input: {
  token: string;
  expiresInHours: number;
  locale: OtpEmailLocale;
  invitationUrl?: string;
}): RenderedEmail {
  const { token, expiresInHours, locale, invitationUrl } = input;
  const title =
    locale === 'fr'
      ? 'Votre invitation au personnel KG Pay'
      : 'Your KG Pay staff invitation';
  const subject =
    locale === 'fr'
      ? 'Votre invitation KG Pay'
      : 'Your KG Pay staff invitation';
  const instruction =
    locale === 'fr'
      ? "Vous avez été invité(e) à créer votre accès au personnel KG Pay. Saisissez ce jeton à usage unique dans l'écran d'acceptation de l'invitation."
      : 'You have been invited to set up your KG Pay staff access. Enter this one-time token on the invitation acceptance page.';
  const expiry =
    locale === 'fr'
      ? `Cette invitation expire dans ${expiresInHours} heures.`
      : `This invitation expires in ${expiresInHours} hours.`;
  const ignore =
    locale === 'fr'
      ? "Si vous n'attendiez pas cette invitation, ignorez cet e-mail."
      : 'If you did not expect this invitation, you can ignore this email.';
  const safeToken = escapeHtml(token);
  const safeUrl = invitationUrl ? escapeHtml(invitationUrl) : undefined;
  const actionText =
    locale === 'fr' ? "Ouvrir l'invitation" : 'Open invitation';
  const actionTextFallback = invitationUrl
    ? `${locale === 'fr' ? "Ouvrir l'invitation" : 'Open invitation'}: ${invitationUrl}\n\n`
    : '';
  const actionHtml = safeUrl
    ? `<p style="margin:24px 0;">
                    <a href="${safeUrl}" style="display:inline-block;padding:14px 20px;border-radius:8px;background:${theme.yellow};color:${theme.ink};font-size:16px;font-weight:700;text-decoration:none;">${actionText}</a>
                  </p>`
    : '';
  const htmlContent = `
                ${paragraph(instruction)}
                ${actionHtml}
                <p style="margin:0 0 18px;color:${theme.muted};font-size:14px;line-height:1.5;">${escapeHtml(locale === 'fr' ? 'Jeton à usage unique' : 'One-time token')}</p>
                <p style="margin:0 0 18px;padding:16px;border:1px solid ${theme.border};border-radius:8px;background:#FFFFFF;color:${theme.green};font-family:monospace;font-size:16px;line-height:1.5;overflow-wrap:anywhere;">${safeToken}</p>
                ${paragraph(expiry)}
                <p style="margin:0;color:${theme.muted};font-size:14px;line-height:1.6;">${escapeHtml(ignore)}</p>`;

  return {
    subject,
    text: `KG Pay\n\n${instruction}\n\n${actionTextFallback}Jeton: ${token}\n\n${expiry}\n${ignore}`,
    html: emailLayout(locale, title, instruction, htmlContent),
  };
}

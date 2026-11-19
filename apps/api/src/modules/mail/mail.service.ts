import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

interface InvitationMail {
  to: string;
  organizationName: string;
  invitedByName: string;
  roleLabel: string;
  courseTitle?: string | null;
  acceptUrl: string;
  expiresAt: Date;
}

/**
 * Envoi d'emails transactionnels.
 * En développement, Mailpit capture tout sur http://localhost:8025.
 * Une panne SMTP ne doit jamais bloquer une action métier : on journalise.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const user = config.get<string>('SMTP_USER');
    const password = config.get<string>('SMTP_PASSWORD');

    this.from = config.get<string>('SMTP_FROM') ?? 'Yellow LMS <no-reply@yellow.academy>';
    this.transporter = createTransport({
      host: config.get<string>('SMTP_HOST') ?? 'localhost',
      port: config.get<number>('SMTP_PORT') ?? 1025,
      secure: false,
      auth: user && password ? { user, pass: password } : undefined,
    });
  }

  async sendInvitation(mail: InvitationMail): Promise<void> {
    const expires = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(mail.expiresAt);

    const courseLine = mail.courseTitle
      ? `<p style="margin:0 0 8px">Parcours attribué : <strong>${escapeHtml(mail.courseTitle)}</strong></p>`
      : '';

    const html = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111827">
        <div style="width:40px;height:40px;border-radius:12px;background:#F5C518;color:#0B0B0C;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:18px">Y</div>
        <h1 style="font-size:22px;margin:24px 0 8px">Vous êtes invité·e à rejoindre ${escapeHtml(mail.organizationName)}</h1>
        <p style="margin:0 0 16px;color:#4B5563">
          ${escapeHtml(mail.invitedByName)} vous invite à rejoindre l’espace de formation
          ${escapeHtml(mail.organizationName)} avec le rôle <strong>${escapeHtml(mail.roleLabel)}</strong>.
        </p>
        ${courseLine}
        <p style="margin:24px 0">
          <a href="${mail.acceptUrl}" style="background:#0B0B0C;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">
            Accepter l’invitation
          </a>
        </p>
        <p style="margin:0 0 8px;color:#6B7280;font-size:13px">
          Ce lien personnel est valable jusqu’au ${expires}. Il ne peut être utilisé qu’une fois.
        </p>
        <p style="margin:0;color:#9CA3AF;font-size:12px">Yellow LMS</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: mail.to,
        subject: `Invitation à rejoindre ${mail.organizationName}`,
        text: [
          `${mail.invitedByName} vous invite à rejoindre ${mail.organizationName} (rôle : ${mail.roleLabel}).`,
          mail.courseTitle ? `Parcours attribué : ${mail.courseTitle}.` : '',
          `Acceptez l’invitation : ${mail.acceptUrl}`,
          `Lien valable jusqu’au ${expires}.`,
        ]
          .filter(Boolean)
          .join('\n\n'),
        html,
      });
    } catch (error) {
      this.logger.warn(
        `Email d’invitation non envoyé à ${mail.to} : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

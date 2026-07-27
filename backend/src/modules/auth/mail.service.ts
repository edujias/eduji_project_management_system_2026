import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log('SMTP mail transporter initialized successfully.');
    } else {
      this.logger.warn(
        'SMTP settings are missing in env. MailService will run in developer mode (console logging).',
      );
    }
  }

  async sendPasswordResetMail(email: string, code: string) {
    const subject = 'Eduji Şifre Sıfırlama Kodu';
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Eduji Proje Yönetim Sistemi</h2>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p>Merhaba,</p>
        <p>Hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki doğrulama kodunu kullanabilirsiniz:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e1b4b; background-color: #f1f5f9; padding: 10px 20px; border-radius: 8px; border: 1px dashed #cbd5e1; display: inline-block;">${code}</span>
        </div>
        <p>Bu doğrulama kodu 15 dakika boyunca geçerlidir. Bu talebi siz gerçekleştirmediyseniz, lütfen bu e-postayı dikkate almayınız.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 11px; color: #64748b; text-align: center;">Eduji Proje Yönetim Platformu © 2026</p>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Eduji Destek" <${process.env.SMTP_FROM || 'noreply@eduji.com'}>`,
          to: email,
          subject,
          html,
        });
        this.logger.log(`Password reset email sent successfully to ${email}`);
      } catch (error: any) {
        this.logger.error(`Failed to send password reset email to ${email}`, error.stack);
        this.logToConsoleAndFile(email, code, html);
      }
    } else {
      this.logToConsoleAndFile(email, code, html);
    }
  }

  private logToConsoleAndFile(email: string, code: string, html: string) {
    this.logger.log(`[DEVELOPER MODE - EMAIL LOG] TO: ${email} | CODE: ${code}`);
    console.log('\n==================================================');
    console.log(`[MAIL LOG] Gönderilen E-posta: ${email}`);
    console.log(`[MAIL LOG] Şifre Sıfırlama Kodu: ${code}`);
    console.log(`[MAIL LOG] E-posta İçeriği:\n`, html);
    console.log('==================================================\n');

    try {
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(process.cwd(), 'uploads', 'mail_logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(logDir, `${email}_reset_code.html`),
        html,
      );
      this.logger.log(`Mail log saved to local file: uploads/mail_logs/${email}_reset_code.html`);
    } catch (err) {
      // silent fallback
    }
  }
}

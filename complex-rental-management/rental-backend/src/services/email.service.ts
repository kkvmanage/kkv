import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/app.config.js';

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    if (config.smtp.host && config.smtp.user) {
      try {
        this.transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.port === 465,
          auth: {
            user: config.smtp.user,
            pass: config.smtp.password
          }
        });
        console.log(`📧 [EmailService] SMTP Transporter initialized (${config.smtp.host}:${config.smtp.port})`);
      } catch (err) {
        console.warn('⚠️ [EmailService] Failed to initialize SMTP transporter:', err);
        this.transporter = null;
      }
    } else {
      console.log('ℹ️ [EmailService] SMTP configuration not set in .env. Emails will be logged to server console.');
    }
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetLink: string
  ): Promise<{ success: boolean; messageId?: string; devLink?: string }> {
    const subject = 'Reset your KKV Gold Finance Rental Management password';
    const recipientName = name || 'Rental Staff';

    const textContent = `Hello ${recipientName},\n\n` +
      `We received a request to reset your Rental Management Portal password.\n\n` +
      `Click the link below to create a new password:\n` +
      `${resetLink}\n\n` +
      `This link expires in 30 minutes.\n\n` +
      `If you did not request this, you can safely ignore this email.\n\n` +
      `Regards,\nKKV Gold Finance\nComplex Rental Management`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAF9; margin: 0; padding: 24px; color: #1F2D26; }
    .container { max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #DDE5DF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #176B52; padding: 28px 24px; text-align: center; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0; font-size: 12px; color: #E8D38A; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 14px; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background-color: #176B52; color: #FFFFFF !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(23,107,82,0.3); }
    .footer { background: #F4F7F5; padding: 20px 28px; font-size: 12px; color: #66756D; border-top: 1px solid #E8EFEA; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>KKV GOLD FINANCE</h1>
      <p>COMPLEX RENTAL MANAGEMENT</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; font-weight: 600; margin-top: 0;">Hello ${recipientName},</p>
      <p>We received a request to reset your Rental Management Portal password.</p>
      <p>Click the button below to create a new password:</p>
      <div class="btn-container">
        <a href="${resetLink}" class="btn" target="_blank">Reset Password</a>
      </div>
      <p style="font-size: 12.5px; color: #66756D;">This link expires in <strong>30 minutes</strong>.</p>
      <p style="font-size: 12.5px; color: #8C9B93; margin-bottom: 0;">If you did not request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <strong>KKV Gold Finance — Complex Rental Management</strong><br>
      Official Commercial Property Management System
    </div>
  </div>
</body>
</html>
    `;

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: config.smtp.mailFrom,
          to,
          subject,
          text: textContent,
          html: htmlContent
        });
        console.log(`✉️ [EmailService] Password reset email sent to ${to}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (err: any) {
        console.error(`❌ [EmailService] Failed to send email via SMTP to ${to}:`, err.message);
        // Fallback log link
        console.log(`🔗 [DEV RESET LINK FOR ${to}]: ${resetLink}`);
        return { success: true, devLink: resetLink };
      }
    } else {
      console.log(`================================================================`);
      console.log(`📨 [LOCAL DEV EMAIL DISPATCH] To: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Reset Link: ${resetLink}`);
      console.log(`================================================================`);
      return { success: true, devLink: resetLink };
    }
  }
}

export const emailService = new EmailService();

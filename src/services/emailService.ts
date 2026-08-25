import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, token: string, fullname: string) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #22c55e; padding: 20px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">NEMAFI</h1>
      </div>
      <div style="padding: 20px;">
        <p>Halo <strong>${fullname}</strong>,</p>
        <p>Kami menerima permintaan untuk mereset kata sandi akun NEMAFI Anda. Jika Anda tidak melakukan permintaan ini, silakan abaikan email ini.</p>
        <p>Untuk mereset kata sandi Anda, klik tombol di bawah ini:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #22c55e; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Kata Sandi</a>
        </div>
        <p>Atau Anda dapat menyalin dan menempelkan tautan berikut ke browser Anda:</p>
        <p style="word-break: break-all; color: #0066cc;">${resetLink}</p>
        <p>Tautan ini hanya berlaku selama 1 jam.</p>
        <br/>
        <p>Salam hangat,</p>
        <p><strong>Tim NEMAFI</strong></p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"NEMAFI" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset Kata Sandi - NEMAFI',
    html: htmlContent,
  });

  return info;
}

export default {
  sendPasswordResetEmail,
};

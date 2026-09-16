// lib/email.ts — send OTP and reset emails via nodemailer
// Install: npm install nodemailer
// Add to .env.local:
//   EMAIL_HOST=smtp.gmail.com
//   EMAIL_PORT=587
//   EMAIL_USER=your@gmail.com
//   EMAIL_PASS=your_app_password   ← Gmail App Password (not your login password)
//   EMAIL_FROM=LumpyAI <your@gmail.com>

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOTPEmail(to: string, name: string, otp: string) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'LumpyAI <noreply@lumpyai.com>',
    to,
    subject: 'Your LumpyAI Verification Code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9fb;border-radius:12px;">
        <h2 style="color:#6953F4;margin-bottom:8px;">LumpyAI</h2>
        <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;">Your verification code is:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#6953F4;">${otp}</span>
        </div>
        <p style="color:#6B7280;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'LumpyAI <noreply@lumpyai.com>',
    to,
    subject: 'Reset your LumpyAI password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9fb;border-radius:12px;">
        <h2 style="color:#6953F4;margin-bottom:8px;">LumpyAI</h2>
        <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;">Click the button below to reset your password. This link expires in 1 hour.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="background:#6953F4;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
        </div>
        <p style="color:#6B7280;font-size:12px;">If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendDoctorApprovalEmail(to: string, name: string, approved: boolean) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'LumpyAI <noreply@lumpyai.com>',
    to,
    subject: approved ? 'Your LumpyAI doctor account is approved!' : 'LumpyAI account update',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9fb;border-radius:12px;">
        <h2 style="color:#6953F4;margin-bottom:8px;">LumpyAI</h2>
        <p style="color:#374151;">Hi Dr. <strong>${name}</strong>,</p>
        ${approved
          ? `<p style="color:#16A34A;font-weight:bold;">✅ Your veterinarian account has been approved! You can now log in.</p>`
          : `<p style="color:#DC2626;">Your account application was not approved. Please contact support.</p>`
        }
      </div>
    `,
  });
}

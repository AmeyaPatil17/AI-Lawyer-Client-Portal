import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import sgMail from '@sendgrid/mail';
import User from '../models/User';
import PasswordResetToken from '../models/PasswordResetToken';
import RefreshToken from '../models/RefreshToken';

// ============================================
// SendGrid setup
// ============================================

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@valiantlaw.ca';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const TOKEN_EXPIRES_MINUTES = 60;

// ============================================
// Branded HTML email builder
// ============================================

function buildResetEmailHtml(resetUrl: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password — Valiant Law</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#1e293b,#162032);border-radius:16px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(90deg,#2563eb,#4f46e5);padding:28px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:10px;width:44px;height:44px;text-align:center;vertical-align:middle;padding:0 10px;">
                    <span style="font-size:22px;line-height:44px;">⚖️</span>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.7);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Valiant Law</p>
              <h1 style="margin:4px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Password Reset Request</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your Valiant Law account. Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:28px auto;">
                <tr>
                  <td style="background:linear-gradient(90deg,#2563eb,#4f46e5);border-radius:10px;">
                    <a href="${resetUrl}" style="display:block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6;">
                This link will expire in <strong style="color:#94a3b8;">${TOKEN_EXPIRES_MINUTES} minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your password will not change.
              </p>

              <!-- Fallback link -->
              <div style="margin-top:24px;padding:16px;background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0 0 6px;color:#64748b;font-size:12px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin:0;word-break:break-all;"><a href="${resetUrl}" style="color:#60a5fa;font-size:12px;text-decoration:underline;">${resetUrl}</a></p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:#475569;font-size:12px;text-align:center;line-height:1.6;">
                Valiant Law Client Portal &nbsp;·&nbsp; This is an automated message, please do not reply.<br />
                If you need help, contact <a href="mailto:support@valiantlaw.ca" style="color:#60a5fa;text-decoration:none;">support@valiantlaw.ca</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// POST /auth/forgot-password
// ============================================

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'Email is required.' });
        }

        // Always respond with the same message to prevent user enumeration
        const GENERIC_RESPONSE = {
            message: 'If an account with that email exists, a reset link has been sent.'
        };

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            // Return generic response — don't reveal if the email exists
            return res.json(GENERIC_RESPONSE);
        }

        // Invalidate any existing reset tokens for this user
        await PasswordResetToken.deleteMany({ userId: user._id });

        // Generate cryptographically secure raw token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 10);

        const expiresAt = new Date(Date.now() + TOKEN_EXPIRES_MINUTES * 60 * 1000);

        await PasswordResetToken.create({
            userId: user._id,
            tokenHash,
            expiresAt,
            used: false,
        });

        // Build reset URL with raw token (only ever sent in email, never stored)
        const resetUrl = `${CLIENT_URL}/reset-password/${rawToken}`;

        await sgMail.send({
            to: user.email,
            from: FROM_EMAIL,
            subject: 'Reset Your Valiant Law Password',
            text: `Reset your password by visiting this link: ${resetUrl}\n\nThis link expires in ${TOKEN_EXPIRES_MINUTES} minutes. If you didn't request this, ignore this email.`,
            html: buildResetEmailHtml(resetUrl),
        });

        return res.json(GENERIC_RESPONSE);

    } catch (error: any) {
        console.error('[ForgotPassword] Error:', error);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
    }
};

// ============================================
// POST /auth/reset-password
// ============================================

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required.' });
        }

        // Server-side password policy: all four rules required
        const passwordErrors: string[] = [];
        if (newPassword.length < 8)            passwordErrors.push('at least 8 characters');
        if (!/[A-Z]/.test(newPassword))         passwordErrors.push('an uppercase letter');
        if (!/[a-z]/.test(newPassword))         passwordErrors.push('a lowercase letter');
        if (!/[0-9]/.test(newPassword))         passwordErrors.push('a number');
        if (!/[^A-Za-z0-9]/.test(newPassword))  passwordErrors.push('a special character');

        if (passwordErrors.length > 0) {
            return res.status(400).json({
                message: `Password must contain ${passwordErrors.join(', ')}.`
            });
        }

        // Find all non-expired, non-used tokens and check each hash
        // (We can't query by hash — we must compare all unexpired tokens)
        const candidates = await PasswordResetToken.find({
            expiresAt: { $gt: new Date() },
            used: false,
        }).populate('userId');

        let matchedDoc: InstanceType<typeof PasswordResetToken> | null = null;

        for (const candidate of candidates) {
            const isMatch = await bcrypt.compare(token, candidate.tokenHash);
            if (isMatch) {
                matchedDoc = candidate;
                break;
            }
        }

        if (!matchedDoc) {
            return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
        }

        const user = matchedDoc.userId as any;

        // Hash the new password and update the user
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await User.updateOne({ _id: user._id }, { passwordHash: newPasswordHash });

        // Invalidate the token and all refresh tokens (force re-login everywhere)
        await PasswordResetToken.deleteMany({ userId: user._id });
        await RefreshToken.deleteMany({ userId: user._id });

        return res.json({ message: 'Password has been reset successfully. Please sign in with your new password.' });

    } catch (error: any) {
        console.error('[ResetPassword] Error:', error);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
    }
};

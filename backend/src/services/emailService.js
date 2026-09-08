/**
 * CAMPUSHUB TRANSACTIONAL EMAIL SERVICE
 * Delivers secure 6-digit OTP verification codes via SMTP or local dev transport.
 */

const nodemailer = require('nodemailer');
const config = require('../config/config');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
    const isGmail = config.SMTP_HOST.toLowerCase().includes('gmail');
    const transportOptions = isGmail
      ? {
          service: 'gmail',
          auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS.replace(/\s+/g, '')
          }
        }
      : {
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          secure: config.SMTP_SECURE,
          auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS.replace(/\s+/g, '')
          }
        };

    transporter = nodemailer.createTransport(transportOptions);
    console.log(`📧 [EMAIL] Configured Live SMTP Transport via ${config.SMTP_HOST} (${config.SMTP_USER})`);
  } else {
    // Development / Local Mode: Safe transporter that logs to console
    transporter = {
      sendMail: async (mailOptions) => {
        console.log(`
⚡ =======================================================
📧 [CAMPUSHUB LOCAL EMAIL DISPATCH]
📬 To:          ${mailOptions.to}
🔑 Subject:     ${mailOptions.subject}
⏱️ Generated:   ${new Date().toLocaleTimeString()}
-------------------------------------------------------
${mailOptions.text}
=======================================================
        `);
        return { messageId: `local-dev-${Date.now()}` };
      }
    };
    console.log('📧 [EMAIL] Running in Local Development Email Mode (OTPs logged to backend console).');
  }

  return transporter;
}

/**
 * Send 6-digit verification code to student's email
 */
async function sendOtpEmail(toEmail, otpCode) {
  const mailTransporter = getTransporter();

  const subject = `⚡ Your CampusHub Verification Code: ${otpCode}`;

  const textContent = `
Your CampusHub Verification Code: ${otpCode}

Enter this 6-digit code in the CampusHub app to verify your college email address and access your student dashboard.

This code will expire in 5 minutes. If you did not request this verification, please ignore this email.

— CampusHub Consortium (Not Your College Network)
  `;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1a1a1a; }
    .card { max-width: 500px; margin: 0 auto; background: #ffffff; border: 3px solid #1a1a1a; border-radius: 12px; box-shadow: 6px 6px 0px #1a1a1a; overflow: hidden; }
    .header { background: #ffe600; padding: 24px; border-bottom: 3px solid #1a1a1a; text-align: center; }
    .title { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0; }
    .tagline { font-size: 13px; font-weight: 700; color: #1a1a1a; text-transform: uppercase; margin-top: 4px; }
    .content { padding: 32px 24px; text-align: center; }
    .instruction { font-size: 15px; line-height: 1.5; color: #4a4a4a; margin-bottom: 24px; }
    .otp-container { background: #f0f4ff; border: 2px dashed #0055ff; border-radius: 8px; padding: 18px; display: inline-block; margin-bottom: 24px; }
    .otp-code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0055ff; margin: 0; }
    .expiry-note { font-size: 13px; color: #888888; margin-bottom: 24px; }
    .footer { background: #fafafa; border-top: 1px solid #e0e0e0; padding: 16px; font-size: 12px; color: #999999; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">🚀 CAMPUSHUB</h1>
      <div class="tagline">Student-Only Builder Network</div>
    </div>
    <div class="content">
      <p class="instruction">Use the following 6-digit verification code to verify your student account and access your campus portal:</p>
      
      <div class="otp-container">
        <div class="otp-code">${otpCode}</div>
      </div>
      
      <div class="expiry-note">⏱️ This code expires in <b>5 minutes</b>. Do not share this code with anyone.</div>
    </div>
    <div class="footer">
      If you did not request this verification, you can safely disregard this email.<br>
      © ${new Date().getFullYear()} CampusHub Consortium. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;

  try {
    return await mailTransporter.sendMail({
      from: config.SMTP_FROM,
      to: toEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    });
  } catch (err) {
    if (config.NODE_ENV === 'production') {
      console.error(`❌ [EMAIL] Live SMTP send failed to ${toEmail}:`, err.message);
      throw new Error('Failed to send verification email. Please try again later.');
    } else {
      console.warn(`⚠️ [EMAIL] Local dev fallback (live send failed: ${err.message}):`);
      console.log(`
⚡ =======================================================
📧 [CAMPUSHUB LOCAL DEV VERIFICATION CODE]
📬 To:          ${toEmail}
🔑 OTP Code:    ${otpCode}
⏱️ Time:        ${new Date().toLocaleTimeString()}
=======================================================
      `);
      return { messageId: `local-dev-${Date.now()}` };
    }
  }
}

module.exports = {
  sendOtpEmail
};

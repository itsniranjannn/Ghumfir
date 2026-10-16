import nodemailer from 'nodemailer';
import 'dotenv/config';
import { fileURLToPath } from 'node:url';

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const FROM = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"Ghumfir (घुमफिर)" <noreply@ghumfir.com>';
const LOGO_PATH = fileURLToPath(new URL('../assets/logo.png', import.meta.url));

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim();
  const pass = rawPass.replace(/\s+/g, '');

  if (user && pass) {
    transporter = nodemailer.createTransport({
      service: (process.env.EMAIL_SERVICE || 'gmail').toLowerCase(),
      auth: { user, pass },
    });
  } else {
    // Development / fallback logger when SMTP credentials are not yet entered
    transporter = {
      sendMail: async (opts) => {
        console.log('\n================== [DEV EMAIL PREVIEW] ==================');
        console.log(`To:      ${opts.to}`);
        console.log(`Subject: ${opts.subject}`);
        console.log('---------------------------------------------------------');
        console.log(opts.text || '(HTML email only)');
        console.log('=========================================================\n');
        return { messageId: 'dev-mock-' + Date.now() };
      },
    };
  }
  return transporter;
}

/** Base responsive HTML email shell matching Ghumfir system design */
function emailShell({ title, subtitle, content, callToAction }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      background-color: #f4efe6;
      font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e1c18;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4efe6;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background: #fbf8f2;
      border: 1px solid #d9d0bf;
      border-radius: 18px;
      box-shadow: 0 4px 20px rgba(30, 28, 24, 0.06);
      overflow: hidden;
    }
    .header {
      background: #fbf8f2;
      padding: 28px 36px 20px;
      border-bottom: 1px solid #ebe4d6;
      text-align: left;
    }
    .brand-table {
      border-collapse: collapse;
    }
    .brand-name {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #1e1c18;
      letter-spacing: -0.5px;
      line-height: 1;
    }
    .brand-np {
      font-size: 15px;
      color: #7a7468;
      margin-left: 6px;
      font-weight: normal;
      line-height: 1;
    }
    .body-content {
      padding: 32px 36px;
      line-height: 1.65;
      font-size: 15px;
      color: #4a463e;
    }
    h1 {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 23px;
      font-weight: 800;
      color: #1e1c18;
      margin: 0 0 6px;
      letter-spacing: -0.4px;
    }
    .subtitle {
      font-size: 14px;
      color: #7a7468;
      margin: 0 0 22px;
      font-weight: 500;
    }
    .btn {
      display: inline-block;
      background-color: #b4472c;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 15px;
      margin: 24px 0 16px;
      box-shadow: 0 4px 14px rgba(180, 71, 44, 0.28);
      letter-spacing: 0.01em;
    }
    .info-box {
      background: #f4efe6;
      border: 1px solid #d9d0bf;
      border-left: 4px solid #b4472c;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 22px 0;
      font-size: 14px;
      color: #4a463e;
    }
    .footer {
      padding: 24px 36px 28px;
      background: #f4efe6;
      border-top: 1px solid #ebe4d6;
      font-size: 12px;
      color: #7a7468;
      line-height: 1.6;
      text-align: center;
    }
    .footer a {
      color: #b4472c;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <table cellpadding="0" cellspacing="0" border="0" class="brand-table">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px; width: 38px;">
              <img src="cid:ghumfir-logo" width="38" height="38" style="display: block; border-radius: 9px; width: 38px; height: 38px;" alt="Ghumfir Logo" />
            </td>
            <td style="vertical-align: middle;">
              <span class="brand-name">Ghumfir</span>
              <span class="brand-np">घुमफिर</span>
            </td>
          </tr>
        </table>
      </div>
      <div class="body-content">
        <h1>${title}</h1>
        ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
        ${content}
        ${callToAction ? `<div style="text-align: center;"><a href="${callToAction.url}" class="btn">${callToAction.text}</a></div>` : ''}
      </div>
      <div class="footer">
        <p style="margin: 0 0 4px;">Ghumfir · Nepal Travel Planner with real road times & dynamic budgets.</p>
        <p style="margin: 0;">Kathmandu, Nepal · <a href="${CLIENT_ORIGIN}">Visit Ghumfir</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const logoAttachment = {
  filename: 'ghumfir-logo.png',
  path: LOGO_PATH,
  cid: 'ghumfir-logo',
};

/** 1. Welcome Email on Registration */
export async function sendWelcomeEmail({ to, name }) {
  const title = `Welcome to Ghumfir, ${name || 'traveller'}!`;
  const content = `
    <p>Namaste 🙏 We’re thrilled to have you with us on Ghumfir.</p>
    <p>Ghumfir helps you plan authentic trips across Nepal built around real road hours, real fuel and food prices, and dynamic optimization algorithms.</p>
    <div class="info-box">
      <strong style="color: #1e1c18;">Here is what you can do on Ghumfir:</strong>
      <ul style="margin: 8px 0 0; padding-left: 20px;">
        <li><strong>Explore Destinations:</strong> Discover high-altitude treks, sacred temples, and tranquil lakes.</li>
        <li><strong>Auto-Plan Itineraries:</strong> Build day-by-day routes tailored to your budget and interests.</li>
        <li><strong>Wishlist & Reviews:</strong> Save destinations and share travel tips with fellow travellers.</li>
      </ul>
    </div>
    <p>Ready to plan your next journey?</p>
  `;

  const html = emailShell({
    title,
    subtitle: 'Your Nepal journey starts here',
    content,
    callToAction: {
      text: 'Start Planning Your Trip →',
      url: `${CLIENT_ORIGIN}/explore`,
    },
  });

  return getTransporter().sendMail({
    from: FROM,
    to,
    subject: `Welcome to Ghumfir (घुमफिर) · Start Planning Nepal`,
    text: `Namaste ${name}! Welcome to Ghumfir. Start planning your Nepal journey at ${CLIENT_ORIGIN}/explore`,
    html,
    attachments: [logoAttachment],
  });
}

/** 2. Email Verification */
export async function sendVerificationEmail({ to, name, token }) {
  const verifyUrl = `${CLIENT_ORIGIN}/verify-email?token=${token}`;
  const title = 'Verify your email address';
  const content = `
    <p>Namaste ${name || ''},</p>
    <p>Thank you for signing up for Ghumfir. Please confirm your email address by clicking the button below to secure your account and activate login:</p>
    <div class="info-box">
      <p style="margin: 0; color: #4a463e;">This verification link will expire in <strong>24 hours</strong>. If you didn't create an account on Ghumfir, you can safely ignore this email.</p>
    </div>
  `;

  const html = emailShell({
    title,
    subtitle: 'Complete your registration',
    content,
    callToAction: {
      text: 'Verify My Email',
      url: verifyUrl,
    },
  });

  return getTransporter().sendMail({
    from: FROM,
    to,
    subject: `Verify your Ghumfir account email`,
    text: `Namaste ${name}! Please verify your email by opening: ${verifyUrl}`,
    html,
    attachments: [logoAttachment],
  });
}

/** 3. Password Reset Email */
export async function sendPasswordResetEmail({ to, name, token }) {
  const resetUrl = `${CLIENT_ORIGIN}/reset-password?token=${token}`;
  const title = 'Reset your Ghumfir password';
  const content = `
    <p>Namaste ${name || ''},</p>
    <p>We received a request to reset your Ghumfir account password. Click the button below to choose a new password:</p>
    <div class="info-box">
      <p style="margin: 0; color: #4a463e;">This link will expire in <strong>1 hour</strong>. For security, never share this link with anyone.</p>
    </div>
    <p>If you didn't request a password reset, you can safely ignore this message; your password will stay unchanged.</p>
  `;

  const html = emailShell({
    title,
    subtitle: 'Account security',
    content,
    callToAction: {
      text: 'Reset My Password',
      url: resetUrl,
    },
  });

  return getTransporter().sendMail({
    from: FROM,
    to,
    subject: `Reset your Ghumfir password`,
    text: `Reset your Ghumfir password here: ${resetUrl} (expires in 1 hour)`,
    html,
    attachments: [logoAttachment],
  });
}

/** 4. Trip Details Email */
export async function sendTripItineraryEmail({ to, name, trip, recipientEmail, senderName }) {
  const tripUrl = `${CLIENT_ORIGIN}/t/${trip.share_code || trip.id}`;
  const title = trip.title || 'Your Nepal Journey Itinerary';
  const senderText = senderName ? `${senderName} has shared a Nepal itinerary with you on Ghumfir:` : 'Here are your complete trip details from Ghumfir:';

  let stopsHtml = '';
  if (Array.isArray(trip.destinations) && trip.destinations.length > 0) {
    stopsHtml = `
      <div style="margin: 22px 0;">
        <strong style="display: block; margin-bottom: 10px; color: #1e1c18;">Destinations in this itinerary:</strong>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${trip.destinations
            .map(
              (d, i) => `
              <div style="padding: 12px 16px; background: #f4efe6; border: 1px solid #d9d0bf; border-radius: 8px; margin-bottom: 8px;">
                <strong style="color: #1e1c18;">${i + 1}. ${d.name}</strong> ${d.name_np ? `<span style="color:#7a7468;">(${d.name_np})</span>` : ''}
                ${d.tagline ? `<div style="font-size: 13px; color: #4a463e; margin-top: 3px;">${d.tagline}</div>` : ''}
              </div>`
            )
            .join('')}
        </div>
      </div>
    `;
  }

  const content = `
    <p>Namaste,</p>
    <p>${senderText}</p>
    <div class="info-box">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #7a7468;">Duration:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #1e1c18; text-align: right;">${trip.days || '—'} days</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7a7468;">Travel Style:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #1e1c18; text-align: right; text-transform: capitalize;">${trip.style || 'Standard'}</td>
        </tr>
        ${trip.total_cost ? `
        <tr>
          <td style="padding: 6px 0; color: #7a7468;">Estimated Cost:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #b4472c; text-align: right;">Rs ${Number(trip.total_cost).toLocaleString('en-IN')}</td>
        </tr>` : ''}
      </table>
    </div>
    ${stopsHtml}
    <p>View the interactive road map, sightseeing schedule, hotel recommendations and cost breakdowns online:</p>
  `;

  const html = emailShell({
    title,
    subtitle: 'Nepal Journey Itinerary',
    content,
    callToAction: {
      text: 'View Full Itinerary Online →',
      url: tripUrl,
    },
  });

  return getTransporter().sendMail({
    from: FROM,
    to: recipientEmail || to,
    subject: `🇳🇵 Itinerary: ${trip.title} (${trip.days || ''} days)`,
    text: `View your Nepal itinerary "${trip.title}" at: ${tripUrl}`,
    html,
    attachments: [logoAttachment],
  });
}

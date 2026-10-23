import nodemailer from 'nodemailer';
import 'dotenv/config';
import { fileURLToPath } from 'node:url';

const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://ghumfir-nine.vercel.app');

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

/**
 * Base responsive HTML email template matching Ghumfir system UI:
 * Warm Himalayan paper palette (#F4EFE6), Terra cotta brand accent (#B4472C),
 * Clean typography, embossed elevation cards, and authentic Ghumfir logo branding.
 */
function emailShell({ title, badge, content, callToAction, tipText }) {
  const logoUrl = `${CLIENT_ORIGIN}/logo.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f2ece1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e1c18; width: 100% !important;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f2ece1; padding: 36px 12px 48px; width: 100%;">
    <tr>
      <td align="center" style="vertical-align: top;">
        
        <!-- Main Card Wrapper -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #dfd6c5; box-shadow: 0 10px 30px rgba(45, 35, 20, 0.07);">
          
          <!-- Top Warm Brand Accent Bar -->
          <tr>
            <td style="background-color: #b4472c; height: 6px; font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>

          <!-- Header / Brand Bar -->
          <tr>
            <td style="padding: 28px 36px 20px; border-bottom: 1px solid #f0e8da; background-color: #faf7f2;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <a href="${CLIENT_ORIGIN}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align: middle; padding-right: 12px;">
                            <img src="${logoUrl}" alt="Ghumfir" width="40" height="40" style="display: block; width: 40px; height: 40px; border-radius: 11px; border: 0; outline: none;" />
                          </td>
                          <td style="vertical-align: middle;">
                            <span style="font-size: 22px; font-weight: 800; color: #1e1c18; letter-spacing: -0.4px; line-height: 1; display: inline-block;">Ghumfir</span>
                            <span style="font-size: 15px; font-weight: 500; color: #8a8275; margin-left: 6px; line-height: 1; display: inline-block;">घुमफिर</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 5px 12px; background-color: #ede5d5; color: #6b6354; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-radius: 999px;">
                      ${badge || 'Nepal Trips'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Email Content Area -->
          <tr>
            <td style="padding: 36px 36px 28px; background-color: #ffffff;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 800; color: #1e1c18; letter-spacing: -0.5px; line-height: 1.25;">
                ${title}
              </h1>

              <div style="font-size: 15px; line-height: 1.65; color: #423d33;">
                ${content}
              </div>

              <!-- Call to Action Button -->
              ${
                callToAction
                  ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${callToAction.url}" target="_blank" style="display: inline-block; background-color: #b4472c; color: #ffffff !important; text-decoration: none; padding: 15px 36px; border-radius: 999px; font-weight: 700; font-size: 15px; letter-spacing: 0.01em; box-shadow: 0 4px 16px rgba(180, 71, 44, 0.32);">
                      ${callToAction.text}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; font-size: 12px; color: #8a8275; text-align: center; word-break: break-all;">
                Or copy and paste this link into your browser:<br/>
                <a href="${callToAction.url}" target="_blank" style="color: #b4472c; text-decoration: underline;">${callToAction.url}</a>
              </p>
              `
                  : ''
              }

              <!-- Subtle Info / Notice Box -->
              ${
                tipText
                  ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; background-color: #faf7f2; border-left: 3px solid #b4472c; border-radius: 8px;">
                <tr>
                  <td style="padding: 14px 18px; font-size: 13px; color: #61594d; line-height: 1.55;">
                    ${tipText}
                  </td>
                </tr>
              </table>
              `
                  : ''
              }
            </td>
          </tr>

          <!-- Elevation Contour Divider Visual -->
          <tr>
            <td style="padding: 0 36px; background-color: #ffffff;">
              <hr style="border: 0; border-top: 1px dashed #e8dfcf; margin: 0;" />
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="padding: 24px 36px 30px; background-color: #faf7f2; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #524b3f;">
                Ghumfir · Nepal travel planner with real road hours &amp; dynamic budgets.
              </p>
              <p style="margin: 0 0 12px; font-size: 11px; color: #8a8275;">
                Kathmandu · 27.7172° N, 85.3240° E · Asia/Kathmandu
              </p>
              <p style="margin: 0; font-size: 11px; color: #9c9487;">
                <a href="${CLIENT_ORIGIN}" target="_blank" style="color: #b4472c; text-decoration: none; font-weight: 600;">Visit Web App</a> ·
                <a href="${CLIENT_ORIGIN}/explore" target="_blank" style="color: #b4472c; text-decoration: none; font-weight: 600;">Explore Destinations</a> ·
                <a href="${CLIENT_ORIGIN}/plan" target="_blank" style="color: #b4472c; text-decoration: none; font-weight: 600;">Plan Trip</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Main Card Wrapper -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** 1. Welcome Email on Registration */
export async function sendWelcomeEmail({ to, name }) {
  const firstName = name ? name.split(' ')[0] : 'Traveller';
  const title = `Namaste ${firstName}, welcome to Ghumfir! 🙏`;
  
  const content = `
    <p style="margin: 0 0 16px;">We’re thrilled to have you with us on Ghumfir, Nepal's authentic travel planner.</p>
    <p style="margin: 0 0 16px;">Ghumfir helps you discover and map true itineraries across Nepal built around real mountain road conditions, accurate bus and jeep hours, fuel costs, and dynamic budget optimization.</p>
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; background-color: #faf7f2; border: 1px solid #e8dfcf; border-radius: 12px; overflow: hidden;">
      <tr>
        <td style="padding: 16px 20px;">
          <strong style="color: #1e1c18; font-size: 14px; display: block; margin-bottom: 8px;">What you can do right now:</strong>
          <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #524b3f; line-height: 1.6;">
            <li><strong>Discover 26+ Destinations:</strong> From Pokhara lakes to Rara, Manang, and Everest foothill treks.</li>
            <li><strong>Auto-Plan Dynamic Routes:</strong> Choose your starting city and let the TSP solver find the shortest loop.</li>
            <li><strong>Budget Transparently:</strong> See lodging, permits, food, and local transit calculated before you pack.</li>
          </ul>
        </td>
      </tr>
    </table>
    <p style="margin: 0;">Ready to start building your upcoming Himalayan adventure?</p>
  `;

  const html = emailShell({
    title,
    badge: 'Welcome',
    content,
    callToAction: {
      text: 'Start Exploring Nepal →',
      url: `${CLIENT_ORIGIN}/explore`,
    },
    tipText: 'Tip: Add destinations to your wishlist or plan your custom loop from Kathmandu, Pokhara, Butwal, or Dharan.',
  });

  return getTransporter().sendMail({
    from: FROM,
    to,
    subject: `Welcome to Ghumfir (घुमफिर) · Start Planning Nepal`,
    text: `Namaste ${name}! Welcome to Ghumfir. Start planning your Nepal journey at ${CLIENT_ORIGIN}/explore`,
    html,
  });
}

/** 2. Email Verification */
export async function sendVerificationEmail({ to, name, token }) {
  const firstName = name ? name.split(' ')[0] : 'Traveller';
  const verifyUrl = `${CLIENT_ORIGIN}/verify-email?token=${token}`;
  const title = `Verify your email address`;

  const content = `
    <p style="margin: 0 0 16px;">Namaste <strong>${firstName}</strong>,</p>
    <p style="margin: 0 0 16px;">Thank you for registering on <strong>Ghumfir</strong>. To activate your account and log in to plan and save your trips, please verify your email address by clicking the button below:</p>
  `;

  const html = emailShell({
    title,
    badge: 'Account Activation',
    content,
    callToAction: {
      text: 'Verify My Email Address →',
      url: verifyUrl,
    },
    tipText: 'For your security, this verification link will expire in <strong>24 hours</strong>. If you did not create this account, you can safely disregard this email.',
  });

  return getTransporter().sendMail({
    from: FROM,
    to,
    subject: `Verify your Ghumfir account email`,
    text: `Namaste ${name}! Please verify your email by opening: ${verifyUrl}`,
    html,
  });
}

/** 3. Password Reset Email */
export async function sendPasswordResetEmail({ to, name, token }) {
  const firstName = name ? name.split(' ')[0] : 'Traveller';
  const resetUrl = `${CLIENT_ORIGIN}/reset-password?token=${token}`;
  const title = `Reset your Ghumfir password`;

  const content = `
    <p style="margin: 0 0 16px;">Namaste <strong>${firstName}</strong>,</p>
    <p style="margin: 0 0 16px;">We received a request to reset the password for your Ghumfir account. Click the button below to choose a secure new password:</p>
  `;

  const html = emailShell({
    title,
    badge: 'Password Reset',
    content,
    callToAction: {
      text: 'Choose New Password →',
      url: resetUrl,
    },
    tipText: 'This password reset link is valid for <strong>1 hour</strong>. If you did not request a password reset, your credentials remain safe and you can ignore this email.',
  });

  return getTransporter().sendMail({
    from: FROM,
    to,
    subject: `Reset your Ghumfir password`,
    text: `Reset your Ghumfir password here: ${resetUrl} (expires in 1 hour)`,
    html,
  });
}

/** 4. Trip Details Email */
export async function sendTripItineraryEmail({ to, name, trip, recipientEmail, senderName }) {
  const tripUrl = `${CLIENT_ORIGIN}/t/${trip.share_code || trip.id}`;
  const title = trip.title || 'Your Nepal Journey Itinerary';
  const senderText = senderName
    ? `<strong>${senderName}</strong> has shared a personalized Nepal itinerary with you on Ghumfir:`
    : 'Here are the details for your upcoming Nepal journey:';

  let stopsHtml = '';
  if (Array.isArray(trip.destinations) && trip.destinations.length > 0) {
    stopsHtml = `
      <div style="margin: 22px 0;">
        <strong style="display: block; margin-bottom: 10px; color: #1e1c18; font-size: 14px;">Destinations along this loop:</strong>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
          ${trip.destinations
            .map(
              (d, i) => `
              <tr>
                <td style="padding: 10px 14px; background-color: #faf7f2; border: 1px solid #e8dfcf; border-radius: 8px; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 22px; height: 22px; line-height: 22px; background-color: #b4472c; color: #ffffff; text-align: center; border-radius: 50%; font-size: 11px; font-weight: 700; margin-right: 8px;">${i + 1}</span>
                  <strong style="color: #1e1c18;">${d.name}</strong> ${d.name_np ? `<span style="color:#8a8275; font-size: 13px;">(${d.name_np})</span>` : ''}
                  ${d.tagline ? `<div style="font-size: 12px; color: #61594d; margin-top: 3px; padding-left: 30px;">${d.tagline}</div>` : ''}
                </td>
              </tr>
              <tr><td style="height: 6px; font-size: 1px;">&nbsp;</td></tr>`
            )
            .join('')}
        </table>
      </div>
    `;
  }

  const content = `
    <p style="margin: 0 0 16px;">Namaste,</p>
    <p style="margin: 0 0 18px;">${senderText}</p>
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf7f2; border: 1px solid #e8dfcf; border-radius: 12px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px;">
            <tr>
              <td style="padding: 5px 0; color: #8a8275;">Duration:</td>
              <td style="padding: 5px 0; font-weight: 700; color: #1e1c18; text-align: right;">${trip.days || '—'} days</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8a8275;">Travel Style:</td>
              <td style="padding: 5px 0; font-weight: 700; color: #1e1c18; text-align: right; text-transform: capitalize;">${trip.style || 'Standard'}</td>
            </tr>
            ${
              trip.total_cost
                ? `
            <tr>
              <td style="padding: 5px 0; color: #8a8275;">Estimated Budget:</td>
              <td style="padding: 5px 0; font-weight: 800; color: #b4472c; text-align: right;">Rs ${Number(trip.total_cost).toLocaleString('en-IN')}</td>
            </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>

    ${stopsHtml}
    <p style="margin: 0;">Explore the full interactive itinerary, day-by-day sightseeing checklist, and stays online:</p>
  `;

  const html = emailShell({
    title,
    badge: 'Nepal Itinerary',
    content,
    callToAction: {
      text: 'View Full Itinerary Online →',
      url: tripUrl,
    },
    tipText: 'You can export this itinerary to PDF, customize stops, or recalculate costs directly on Ghumfir.',
  });

  return getTransporter().sendMail({
    from: FROM,
    to: recipientEmail || to,
    subject: `🇳🇵 Itinerary: ${trip.title} (${trip.days || ''} days)`,
    text: `View your Nepal itinerary "${trip.title}" at: ${tripUrl}`,
    html,
  });
}

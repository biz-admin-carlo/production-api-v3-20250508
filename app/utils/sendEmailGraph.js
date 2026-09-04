'use strict';

const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
require('isomorphic-fetch');

const tenantId     = process.env.TENANT_ID;
const clientId     = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const sender       = process.env.EMAIL_SENDER;
const logoUrl      = 'https://mybizsolutions.us/static/media/icon-app-logo.83ff8bf39a11df9fb7ac.jpg';
const supportEmail = 'info@bizsolutions.us';

const cred = new ClientSecretCredential(tenantId, clientId, clientSecret);
const graph = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: () =>
      cred.getToken('https://graph.microsoft.com/.default').then(t => t.token),
  },
});

async function sendMail({ to, subject, html, cc, bcc, saveToSentItems = true }) {
  const toRecipients  = normalizeAddresses(to);
  const ccRecipients  = normalizeAddresses(cc);
  const bccRecipients = normalizeAddresses(bcc);

  const message = {
    subject,
    body: { contentType: 'HTML', content: html },
    toRecipients,
  };
  if (ccRecipients.length)  message.ccRecipients  = ccRecipients;
  if (bccRecipients.length) message.bccRecipients = bccRecipients;

  await graph.api(`/users/${sender}/sendMail`).post({
    message,
    saveToSentItems,
  });
}

function normalizeAddresses(a) {
  if (!a) return [];
  const arr = Array.isArray(a) ? a : [a];
  return arr
    .map(address => (address ? String(address).trim() : ''))
    .filter(Boolean)
    .map(address => ({ emailAddress: { address } }));
}

function formatDateTime(ts, opts = {}) {
  const {
    locale = 'en-US',
    timeZone,
    dateStyle = 'medium',
    timeStyle = 'short',
  } = opts;
  const d = ts instanceof Date ? ts : new Date(Number(ts));
  return d.toLocaleString(locale, { dateStyle, timeStyle, ...(timeZone ? { timeZone } : {}) });
}

function formatAmount(amountInMinor, currency = 'usd') {
  if (typeof amountInMinor !== 'number') return '';
  const major = amountInMinor / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(major);
}

function safeCard(last4, brand) {
  const l4 = last4 ? String(last4).padStart(4, '•') : '----';
  const b  = brand ? brand.toUpperCase() : 'CARD';
  return `${b} ••••${l4}`;
}

function emailShell({ title, bodyHtml }) {
  const year = new Date().getFullYear();
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${logoUrl}" alt="MyBizSolutions" style="height:48px;" />
      </div>
      ${title ? `<h2 style="color:#111827;font-size:20px;margin-top:0;">${title}</h2>` : ''}
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
        <footer style="font-size:12px;color:#9ca3af;text-align:center;">
          <p>This is a system-generated e-mail. Please do not reply.</p>
          <p>&copy; ${year} BizSolutions LLC.</p>
        </footer>
    </div>
  `;
}

function getPaymentSuccessHtml({
  fullName,
  chargeId,
  amountMinor,
  currency,
  createdAt,
  receiptUrl,
  cardLast4,
  cardBrand,
}) {
  const niceDate    = formatDateTime(createdAt, { locale: 'en-US' });
  const amt         = formatAmount(amountMinor, currency);
  const cardDisplay = safeCard(cardLast4, cardBrand);

  const bodyHtml = `
    <p style="font-size:16px;">Hello ${fullName || 'Customer'},</p>
    <p>We successfully received your payment on <strong>${niceDate}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      <tr>
        <td style="padding:8px;border:1px solid #ddd;"><strong>Amount</strong></td>
        <td style="padding:8px;border:1px solid #ddd;">${amt}</td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;"><strong>Charge ID</strong></td>
        <td style="padding:8px;border:1px solid #ddd;">${chargeId}</td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;"><strong>Card</strong></td>
        <td style="padding:8px;border:1px solid #ddd;">${cardDisplay}</td>
      </tr>
    </table>
    ${
      receiptUrl
        ? `<p>View your receipt <a href="${receiptUrl}" style="color:#0078d4;text-decoration:underline;">here</a>.</p>`
        : ''
    }
    <p>If you did <strong>not</strong> authorize this payment, please 
      <a href="mailto:${supportEmail}" style="color:#0078d4;">contact support</a>.
    </p>
  `;

  return emailShell({ title: 'Payment Received', bodyHtml });
}

function getDisputeNotificationHtml({
  fullName,
  email,
  disputeId,
  chargeId,
  amountMinor,
  currency,
  reason,
  status,
  createdAt,
  dueBy,
  cardLast4,
  cardBrand,
}) {
  const amt         = formatAmount(amountMinor, currency);
  const createdNice = formatDateTime(createdAt, { locale: 'en-US' });
  const dueNice     = dueBy ? formatDateTime(dueBy, { locale: 'en-US' }) : '—';
  const cardDisplay = safeCard(cardLast4, cardBrand);

  const bodyHtml = `
    <p style="font-size:16px;color:#dc2626;">Dispute Opened</p>
    <p>A dispute has been opened on a recent Stripe charge.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Dispute ID</strong></td><td style="padding:8px;border:1px solid #ddd;">${disputeId}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Charge ID</strong></td><td style="padding:8px;border:1px solid #ddd;">${chargeId}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Customer</strong></td><td style="padding:8px;border:1px solid #ddd;">${fullName || 'Unknown'} (${email || 'no-email'})</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Amount</strong></td><td style="padding:8px;border:1px solid #ddd;">${amt}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Card</strong></td><td style="padding:8px;border:1px solid #ddd;">${cardDisplay}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Reason</strong></td><td style="padding:8px;border:1px solid #ddd;">${reason || '—'}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Status</strong></td><td style="padding:8px;border:1px solid #ddd;">${status}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Opened</strong></td><td style="padding:8px;border:1px solid #ddd;">${createdNice}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Evidence Due</strong></td><td style="padding:8px;border:1px solid #ddd;">${dueNice}</td></tr>
    </table>
    <p>Please review and respond in the Stripe Dashboard.</p>
  `;

  return emailShell({ title: 'Stripe Charge Dispute', bodyHtml });
}

function getWelcomeEmailHtml(user, activationLink) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;padding:32px;">
      <div style="border-bottom:3px solid #f97316;margin-bottom:24px;">
        <h1 style="color:#f97316;margin:0;">MyBizSolutions</h1>
        <small style="color:#6b7280;">Powered by BizSolutions LLC</small>
      </div>
      <h2 style="color:#111827;font-size:20px;">Welcome, ${user.fullName}!</h2>
      <p>Please verify your account by clicking below:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${activationLink}"
           style="background:#f97316;color:#fff;padding:12px 24px;
                  text-decoration:none;border-radius:6px;font-weight:bold;">
          ACTIVATE MY ACCOUNT
        </a>
      </div>
      <p style="font-size:14px;color:#6b7280;">
        This link is valid for 24 hours.
      </p>
      <footer style="font-size:12px;color:#9ca3af;text-align:center;margin-top:32px;">
        <p>This is a system-generated e-mail. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} BizSolutions LLC.</p>
      </footer>
    </div>
  `;
}

function getWelcomeSubscriberEmailHtml(user, activationLink, tempPassword) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;padding:32px;">
      <div style="border-bottom:3px solid #f97316;margin-bottom:24px;">
        <h1 style="color:#f97316;margin:0;">MyBizSolutions</h1>
        <small style="color:#6b7280;">Powered by BizSolutions LLC</small>
      </div>
      <h2 style="color:#111827;font-size:20px;">Welcome, ${user.fullName}!</h2>
      <p>Your account has been created successfully. You can now log in using the following credentials:</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Email</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${user.email}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Temporary Password</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${tempPassword}</td>
        </tr>
      </table>
      <p>Please activate your account by clicking the button below:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${activationLink}"
           style="background:#f97316;color:#fff;padding:12px 24px;
                  text-decoration:none;border-radius:6px;font-weight:bold;">
          ACTIVATE MY ACCOUNT
        </a>
      </div>
      <p style="font-size:14px;color:#6b7280;">
        This link is valid for 24 hours. After logging in, we strongly recommend that you change your password.
      </p>
      <footer style="font-size:12px;color:#9ca3af;text-align:center;margin-top:32px;">
        <p>This is a system-generated e-mail. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} BizSolutions LLC.</p>
      </footer>
    </div>
  `;
}

function getBillingNotificationHtml({ fullName, referenceId, submittedAt, cardLast4 }) {
  const niceDate = new Date(submittedAt).toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short'
  });
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e1e1e1;padding:20px;">
      <div style="text-align:center;margin-bottom:20px;">
        <img src="${logoUrl}" alt="MyBizSolutions" style="height:48px;" />
      </div>
      <h2 style="color:#333;">Hello ${fullName},</h2>
      <p>Your billing details were <strong>successfully added</strong> on <strong>${niceDate}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Reference ID</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${referenceId}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Card Last 4</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">**** ${cardLast4}</td>
        </tr>
      </table>
      <p>If you did <strong>not</strong> add these details, please 
        <a href="info@bizsolutions.us" style="color:#0078d4;">contact support</a>.
      </p>
      <hr style="border:none;border-top:1px solid #e1e1e1;margin:20px 0;" />
      <footer style="font-size:12px;color:#999;text-align:center;">
        <p>This is a system-generated e-mail. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} BizSolutions LLC.</p>
      </footer>
    </div>
  `;
}

function getAdminPlanChangeNotificationHtml({
  fullName,
  email,
  userId,
  currentPlan,
  targetPlan,
  reason,
  submittedAt,
  referenceId,
}) {
  const niceDate = formatDateTime(submittedAt, { locale: 'en-US' });

  const bodyHtml = `
    <p style="font-size:16px;">A user has requested a subscription plan change.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>User</strong></td><td style="padding:8px;border:1px solid #ddd;">${fullName} (${email})</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>User ID</strong></td><td style="padding:8px;border:1px solid #ddd;">${userId}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>From Plan</strong></td><td style="padding:8px;border:1px solid #ddd;">${currentPlan}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>To Plan</strong></td><td style="padding:8px;border:1px solid #ddd;">${targetPlan}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Submitted At</strong></td><td style="padding:8px;border:1px solid #ddd;">${niceDate}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Reason</strong></td><td style="padding:8px;border:1px solid #ddd;">${reason || '—'}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Reference ID</strong></td><td style="padding:8px;border:1px solid #ddd;">${referenceId}</td></tr>
    </table>
  `;

  return emailShell({
    title: 'Plan Change Requested',
    bodyHtml,
  });
}

function getUserPlanChangeEmailHtml({ fullName, oldPlan, newPlan, referenceId }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;padding:32px;">
      <div style="border-bottom:3px solid #f97316;margin-bottom:24px;">
        <h1 style="color:#f97316;margin:0;">MyBizSolutions</h1>
        <small style="color:#6b7280;">Powered by BizSolutions LLC</small>
      </div>
      <h2 style="color:#111827;">Hello ${fullName},</h2>
      <p>This is to confirm that your subscription plan change has been successfully initiated.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Previous Plan</strong></td><td style="padding:8px;border:1px;border:1px solid #ddd;">${oldPlan}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>New Plan</strong></td><td style="padding:8px;border:1px solid #ddd;">${newPlan}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Reference ID</strong></td><td style="padding:8px;border:1px solid #ddd;">${referenceId}</td></tr>
      </table>
      <p style="margin-top: 24px;">Our support team will follow up with you regarding this request shortly. Please keep the reference number above for your records.</p>
      <p>If you did not make this change or believe this is an error, please contact us at 
        <a href="mailto:info@bizsolutions.us" style="color:#0078d4;">info@bizsolutions.us</a>.
      </p>
      <footer style="font-size:12px;color:#9ca3af;text-align:center;margin-top:32px;">
        <p>This is a system-generated e-mail. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} BizSolutions LLC.</p>
      </footer>
    </div>
  `;
}

function getUserTerminationEmailHtml({ fullName, referenceId }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;padding:32px;">
      <div style="border-bottom:3px solid #ef4444;margin-bottom:24px;">
        <h1 style="color:#ef4444;margin:0;">MyBizSolutions</h1>
        <small style="color:#6b7280;">Powered by BizSolutions LLC</small>
      </div>
      <h2 style="color:#111827;">Hello ${fullName},</h2>
      <p>We received your termination request.</p>
      <p><strong>Reference ID:</strong> ${referenceId}</p>
      <p>Our support team will follow up with you shortly. Please use the provided reference number in your correspondence.</p>
      <p>If this was not you, please email <a href="mailto:info@bizsolutions.us" style="color:#0078d4;">info@bizsolutions.us</a>.</p>
      <footer style="font-size:12px;color:#9ca3af;text-align:center;margin-top:32px;">
        <p>This is a system-generated e-mail. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} BizSolutions LLC.</p>
      </footer>
    </div>
  `;
}

function getAdminPlanChangeNotificationHtml({ fullName, email, userId, oldPlan, newPlan, reason, referenceId, submittedAt }) {
  const niceDate = formatDateTime(submittedAt, { locale: 'en-US' });
  const bodyHtml = `
    <p style="font-size:16px;">A user has requested a subscription plan change.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>User</strong></td><td style="padding:8px;border:1px solid #ddd;">${fullName} (${email})</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>User ID</strong></td><td style="padding:8px;border:1px solid #ddd;">${userId}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>From Plan</strong></td><td style="padding:8px;border:1px solid #ddd;">${oldPlan}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>To Plan</strong></td><td style="padding:8px;border:1px solid #ddd;">${newPlan}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Reference ID</strong></td><td style="padding:8px;border:1px solid #ddd;">${referenceId}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Submitted At</strong></td><td style="padding:8px;border:1px solid #ddd;">${niceDate}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Reason</strong></td><td style="padding:8px;border:1px solid #ddd;">${reason || '—'}</td></tr>
    </table>
  `;
  return emailShell({ title: 'Plan Change Requested', bodyHtml });
}

function getAdminTerminationNotificationHtml({ fullName, email, userId, reason, referenceId, submittedAt }) {
  const niceDate = formatDateTime(submittedAt, { locale: 'en-US' });
  const bodyHtml = `
    <p style="font-size:16px;color:#dc2626;">Termination Request Opened</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>User</strong></td><td style="padding:8px;border:1px solid #ddd;">${fullName} (${email})</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>User ID</strong></td><td style="padding:8px;border:1px solid #ddd;">${userId}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Reference ID</strong></td><td style="padding:8px;border:1px solid #ddd;">${referenceId}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Submitted At</strong></td><td style="padding:8px;border:1px solid #ddd;">${niceDate}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Reason</strong></td><td style="padding:8px;border:1px solid #ddd;">${reason || '—'}</td></tr>
    </table>
  `;
  return emailShell({ title: 'Account Termination Request', bodyHtml });
}

function maskCommentPreview(text) {
  if (!text || !text.trim()) return '';

  const words = text.trim().split(/\s+/);
  const [firstWord, ...rest] = words;
  const cappedRest = rest.slice(0, 12);
  const maskedRest = cappedRest.map((w) => '*'.repeat(Math.min(w.length, 8)));
  const suffix = rest.length > cappedRest.length ? ' …' : '';

  return [firstWord, ...maskedRest].join(' ') + suffix;
}

function getNewReviewNotificationHtml({ bizName, reviewerName, rating, comment, isVerified, portalLink }) {
  const safeRating = Math.max(1, Math.min(5, Number(rating) || 0));
  const stars = '⭐'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
  const maskedComment = maskCommentPreview(comment);
  const verifiedBadge = isVerified
    ? '<span style="background:#16a34a;color:#fff;font-size:11px;padding:2px 8px;border-radius:12px;margin-left:8px;">VERIFIED</span>'
    : '';

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#0b0b0f;color:#f4f4f5;border:1px solid #27272a;padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${logoUrl}" alt="MyBizSolutions" style="height:48px;filter:grayscale(1) brightness(2);" />
      </div>
      <p style="text-align:center;letter-spacing:2px;font-size:12px;color:#f97316;text-transform:uppercase;margin-bottom:8px;">
        Someone's talking about your business...
      </p>
      <h2 style="text-align:center;font-size:24px;margin:0 0 16px;color:#fff;">A New Review Has Arrived</h2>
      <p style="text-align:center;color:#a1a1aa;">
        <strong style="color:#fff;">${bizName}</strong> just received a new review.
      </p>
      <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:22px;letter-spacing:2px;">${stars}</p>
        <p style="margin:0 0 4px;font-weight:bold;">${reviewerName || 'Anonymous'}${verifiedBadge}</p>
        <p style="margin:12px 0 0;color:#d4d4d8;font-family:'Courier New',monospace;letter-spacing:1px;">&ldquo;${maskedComment}&rdquo;</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${portalLink}"
           style="background:#f97316;color:#000;padding:14px 28px;text-decoration:none;
                  border-radius:6px;font-weight:bold;display:inline-block;">
          CHECK IT OUT &rarr;
        </a>
      </div>
      <p style="text-align:center;font-size:12px;color:#71717a;">
        Log in to reveal and read the full review.
      </p>
      <hr style="border:none;border-top:1px solid #27272a;margin:32px 0;" />
      <footer style="font-size:12px;color:#52525b;text-align:center;">
        <p>This is a system-generated e-mail. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} BizSolutions LLC.</p>
      </footer>
    </div>
  `;
}

module.exports = {
  sendMail,
  getPaymentSuccessHtml,
  getDisputeNotificationHtml,
  getWelcomeEmailHtml,
  getBillingNotificationHtml,
  getWelcomeSubscriberEmailHtml,
  getUserPlanChangeEmailHtml,
  getAdminPlanChangeNotificationHtml,
  getUserTerminationEmailHtml,
  getAdminTerminationNotificationHtml,
  getNewReviewNotificationHtml
};

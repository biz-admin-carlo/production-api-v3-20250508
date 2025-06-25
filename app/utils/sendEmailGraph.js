const { Client }    = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
require('isomorphic-fetch');

const tenantId     = process.env.TENANT_ID;
const clientId     = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const sender       = process.env.EMAIL_SENDER;
const logoUrl      = 'https://mybizsolutions.us/static/media/icon-app-logo.83ff8bf39a11df9fb7ac.jpg';

const cred = new ClientSecretCredential(tenantId, clientId, clientSecret);
const graph = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: () => cred.getToken("https://graph.microsoft.com/.default").then(t => t.token)
  }
});
async function sendMail({ to, subject, html }) {
  const recipients = (Array.isArray(to) ? to : [to]).map(address => ({
    emailAddress: { address }
  }));

  await graph
    .api(`/users/${sender}/sendMail`)
    .post({
      message: {
        subject,
        body: { contentType:'HTML', content: html },
        toRecipients: recipients
      }
    });
}


// ————— Billing notification template —————
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
        &copy; ${new Date().getFullYear()} BizSolutions LLC.
      </footer>
    </div>
  `;
}

// ————— Welcome / activation template —————
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
        &copy; ${new Date().getFullYear()} BizSolutions LLC. Do not reply.
      </footer>
    </div>
  `;
}

module.exports = {
  sendMail,
  getBillingNotificationHtml,
  getWelcomeEmailHtml
};

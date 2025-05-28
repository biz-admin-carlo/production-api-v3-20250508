const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
require('isomorphic-fetch');

const tenantId = process.env.TENANT_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

const client = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async () => {
      const token = await credential.getToken("https://graph.microsoft.com/.default");
      return token.token;
    }
  }
});

const sendEmail = async ({ to, subject, html }) => {
  const message = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: html,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    }
  };

  await client.api('/users/' + process.env.EMAIL_SENDER + '/sendMail').post(message);
};

const getWelcomeEmailHtml = (user, activationLink) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; padding: 32px;">
        <div style="border-bottom: 3px solid #f97316; margin-bottom: 24px;">
          <h1 style="color: #f97316; margin: 0;">MyBizSolutions</h1>
          <small style="color: #6b7280;">Powered by BizSolutions LLC</small>
        </div>
  
        <h2 style="color: #111827; font-size: 20px; font-weight: bold;">Welcome to MyBizSolutions!</h2>
  
        <p style="margin: 16px 0;">
          Thank you for creating your MyBizSolutions account — your gateway to discovering and listing top local businesses.
        </p>
  
        <p style="margin: 16px 0;">
          You're just one step away from activating your account. Please click the button below to verify your email address:
        </p>
  
        <div style="text-align: center; margin: 24px 0;">
          <a href="${activationLink}" style="background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ACTIVATE MY ACCOUNT
          </a>
        </div>
  
        <p style="font-size: 14px; color: #6b7280;">
          For security reasons, the activation link will only be valid for the next 24 hours. If the link expires, you can register again to receive a new activation link.
        </p>
  
        <p style="margin-top: 32px;">Welcome aboard,</p>
        <p style="font-weight: bold; color: #f97316;">The BizSolutions Team</p>
  
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
  
        <footer style="font-size: 12px; color: #9ca3af; text-align: center;">
          &copy; ${new Date().getFullYear()} BizSolutions LLC. All rights reserved.<br />
          This is an automated email, please do not reply.
        </footer>
      </div>
    `;
};
  
module.exports = { sendEmail, getWelcomeEmailHtml };
  
// app/utils/rsaKeys.js
const fs   = require('fs');
const path = require('path');

let privateKey, publicKey;

if (process.env.NODE_ENV === 'production') {
  // in PROD we expect the keys to live in environment variables
  // (Render, Heroku, AWS, etc. set these securely in their UI)
  if (!process.env.PRIVATE_KEY || !process.env.PUBLIC_KEY) {
    throw new Error('Missing PRIVATE_KEY / PUBLIC_KEY in prod environment');
  }
  // replace literal "\n" with real line breaks:
  privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
  publicKey  = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');
} else {
  // in dev we read them from disk
  privateKey = fs.readFileSync(
    path.join(__dirname, '..', '..', 'keys', 'private.key'),
    'utf8'
  );
  publicKey = fs.readFileSync(
    path.join(__dirname, '..', '..', 'keys', 'public.key'),
    'utf8'
  );
}

module.exports = { privateKey, publicKey };

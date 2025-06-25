// app/utils/cryptoUtils.js
const crypto = require('crypto');
const { publicKey, privateKey } = require('./rsaKeys');

// Encrypt with RSA public key, output base64
function encryptRSA(data) {
  return crypto.publicEncrypt(publicKey, Buffer.from(data, 'utf8'))
               .toString('base64');
}

// Decrypt back with RSA private key
function decryptRSA(encryptedData) {
  return crypto.privateDecrypt(
    privateKey,
    Buffer.from(encryptedData, 'base64')
  ).toString('utf8');
}

module.exports = { encryptRSA, decryptRSA };

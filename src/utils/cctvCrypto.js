const crypto = require('crypto');
const env = require('../config/env');

// Master encryption key derived from environment or secure application fallback
const ENCRYPTION_SECRET = process.env.CCTV_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'NexusPMS-CCTV-Secure-Master-Key-2026';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY = crypto.scryptSync(ENCRYPTION_SECRET, 'nexus_cctv_salt', 32);

/**
 * Encrypt sensitive camera credentials (password, API keys, private tokens)
 * @param {string} text - Plain text to encrypt
 * @returns {{ cipherText: string, iv: string, authTag: string }}
 */
const encryptCredentials = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    cipherText: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag
  };
};

/**
 * Decrypt encrypted camera credentials
 * @param {{ cipherText: string, iv: string, authTag: string }|string} encryptedObj 
 * @returns {string} Plain text password/credential
 */
const decryptCredentials = (encryptedObj) => {
  if (!encryptedObj) return '';
  try {
    let cipherText, ivHex, authTagHex;
    if (typeof encryptedObj === 'string') {
      const parsed = JSON.parse(encryptedObj);
      cipherText = parsed.cipherText;
      ivHex = parsed.iv;
      authTagHex = parsed.authTag;
    } else {
      cipherText = encryptedObj.cipherText;
      ivHex = encryptedObj.iv;
      authTagHex = encryptedObj.authTag;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    throw new Error('Credential decryption failed: invalid key or corrupted payload');
  }
};

/**
 * Generate a short-lived HMAC signed stream session token
 * Exposes NO camera credentials and expires in specified minutes.
 */
const generateStreamSessionToken = (cameraId, userId, type = 'LIVE', ttlMinutes = 15) => {
  const expiresAt = Date.now() + (ttlMinutes * 60 * 1000);
  const payload = `${cameraId}:${userId}:${type}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', ENCRYPTION_SECRET).update(payload).digest('hex');
  const token = Buffer.from(JSON.stringify({
    cameraId,
    userId,
    type,
    expiresAt,
    signature: hmac
  })).toString('base64url');
  return token;
};

/**
 * Verify a short-lived stream session token
 */
const verifyStreamSessionToken = (token) => {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const data = JSON.parse(raw);
    if (Date.now() > data.expiresAt) {
      return { valid: false, error: 'TOKEN_EXPIRED' };
    }
    const payload = `${data.cameraId}:${data.userId}:${data.type}:${data.expiresAt}`;
    const expectedHmac = crypto.createHmac('sha256', ENCRYPTION_SECRET).update(payload).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(data.signature), Buffer.from(expectedHmac))) {
      return { valid: true, data };
    }
    return { valid: false, error: 'INVALID_SIGNATURE' };
  } catch (err) {
    return { valid: false, error: 'MALFORMED_TOKEN' };
  }
};

module.exports = {
  encryptCredentials,
  decryptCredentials,
  generateStreamSessionToken,
  verifyStreamSessionToken
};

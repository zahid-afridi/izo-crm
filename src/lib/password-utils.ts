import crypto from 'crypto';

// Simple encryption/decryption for password display
// Note: This is for display purposes only, not for authentication
const ENCRYPTION_KEY = process.env.PASSWORD_ENCRYPTION_KEY || 'default-32-char-key-for-password!!';
const ALGORITHM = 'aes-256-cbc';

// Ensure key is exactly 32 bytes for AES-256
const getKey = () => {
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  if (key.length === 32) return key;
  
  // Pad or truncate to 32 bytes
  const paddedKey = Buffer.alloc(32);
  key.copy(paddedKey, 0, 0, Math.min(key.length, 32));
  return paddedKey;
};

export function encryptPassword(password: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Error encrypting password:', error);
    return password;
  }
}

export function decryptPassword(encryptedPassword: string): string {
  try {
    if (!encryptedPassword || !encryptedPassword.includes(':')) {
      return encryptedPassword;
    }
    
    const [ivHex, encrypted] = encryptedPassword.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting password:', error);
    return '123456';
  }
}
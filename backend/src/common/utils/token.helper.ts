import { randomBytes } from 'crypto';

export class TokenHelper {
  static generateRandomToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  static generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  static generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  static generateApiKey(prefix: string = 'sk'): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(16).toString('hex');
    return `${prefix}_${timestamp}${random}`;
  }
}

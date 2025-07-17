export class OTPTemplate {
  static formatMessage(otpCode: string, expiryMinutes: number = 5): string {
    return `Your verification code is: ${otpCode}. Do not share this code with anyone. Code expires in ${expiryMinutes} minutes.`;
  }
}
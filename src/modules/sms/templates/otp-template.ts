export class OTPTemplate {
  static formatMessage(otpCode: string, expiryMinutes: number = 5): string {
    return `Dear user, your 1Driver login code is: ${otpCode}. You must use it within ${expiryMinutes} minutes.`;
  }
}

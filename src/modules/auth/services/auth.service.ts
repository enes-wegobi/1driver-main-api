import { Injectable } from '@nestjs/common';
import { AuthClient } from 'src/clients/auth/auth.client';
import { CreateCustomerDto } from 'src/clients/auth/dto/create-customer.dto';
import { CreateDriverDto } from 'src/clients/auth/dto/create-driver.dto';
import { SigninDto } from 'src/clients/auth/dto/signin.dto';
import { ValidateOtpDto } from 'src/clients/auth/dto/validate-otp.dto';
import { UserType } from 'src/common/user-type.enum';
import { LoggerService } from 'src/logger/logger.service';
import { DriverEarningsService } from 'src/modules/drivers/services/driver-earnings.service';
import { PaymentsService } from 'src/modules/payments/services/payments.service';
import { SendSMSDto } from 'src/modules/sms/dto/send-sms.dto';
import { MessageType } from 'src/modules/sms/enums/message-type.enum';
import { SMSService } from 'src/modules/sms/sms.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly authClient: AuthClient,
    private readonly paymentsService: PaymentsService,
    private readonly driverEarningsService: DriverEarningsService,
    private readonly logger: LoggerService,
    private readonly smsService: SMSService,
  ) {}

  // Customer Auth Methods
  async initiateCustomerSignup(createCustomerDto: CreateCustomerDto) {
    const result = await this.authClient.initiateCustomerSignup(createCustomerDto);
    
    if (result?.otp) {
      this.sendOTPSMS(createCustomerDto.phone, result.otp).catch(error => {
        this.logger.error(`Failed to send OTP SMS: ${error.message}`);
      });
    }
    
    return result;
  }

  async completeCustomerSignup(validateOtpDto: ValidateOtpDto) {
    const result = await this.authClient.completeCustomerSignup(validateOtpDto);

    // Create Stripe customer after successful signup
    if (result && result.token && result.customer) {
      try {
        await this.paymentsService.createStripeCustomer(result.customer._id, {
          name: `${result.customer.name} ${result.customer.surname}`,
          email: result.customer.email,
          phone: result.customer.phone,
        });
      } catch (error) {
        // Log error but don't fail the signup
        this.logger.logError(error, {
          userId: result.customer._id,
          userType: UserType.CUSTOMER,
          action: 'create_stripe_customer_failed',
        });
      }

      return { token: result.token, customer: result.customer };
    }

    return result;
  }

  async signinCustomer(signinDto: SigninDto) {
    const result = await this.authClient.signinCustomer(signinDto);
    
    if (result?.otp) {
      this.sendOTPSMS(signinDto.phone, result.otp).catch(error => {
        this.logger.error(`Failed to send OTP SMS: ${error.message}`);
      });

      result.otp = process.env.NODE_ENV === 'development' ? result.top : undefined;
    }
    
    return result;
  }

  async completeCustomerSignin(validateOtpDto: ValidateOtpDto) {
    return this.authClient.completeCustomerSignin(validateOtpDto);
  }

  // Driver Auth Methods
  async initiateDriverSignup(createDriverDto: CreateDriverDto) {
    const result = await this.authClient.initiateDriverSignup(createDriverDto);
    
    if (result?.otp) {
      this.sendOTPSMS(createDriverDto.phone, result.otp).catch(error => {
        this.logger.error(`Failed to send OTP SMS: ${error.message}`);
      });
    }
    
    return result;
  }

  async completeDriverSignup(validateOtpDto: ValidateOtpDto) {
    const result = await this.authClient.completeDriverSignup(validateOtpDto);

    // Create initial weekly earnings record after successful driver signup
    if (result && result.token && result.driver) {
      try {
        await this.driverEarningsService.findOrCreateCurrentWeekRecord(
          result.driver._id,
        );
      } catch (error) {
        // Log error but don't fail the signup
        this.logger.logError(error, {
          userId: result.driver._id,
          userType: UserType.DRIVER,
          action: 'create_weekly_earnings_record_failed',
        });
      }

      return { token: result.token, driver: result.driver };
    }

    return result;
  }

  async signinDriver(signinDto: SigninDto) {
    const result = await this.authClient.signinDriver(signinDto);
    
    if (result?.otp) {
      this.sendOTPSMS(signinDto.phone, result.otp).catch(error => {
        this.logger.error(`Failed to send OTP SMS: ${error.message}`);
      });
    }
    
    return result;
  }

  async completeDriverSignin(validateOtpDto: ValidateOtpDto) {
    return this.authClient.completeDriverSignin(validateOtpDto);
  }

  // Resend OTP Methods
  async resendCustomerOtp(signinDto: SigninDto) {
    const result = await this.authClient.resendCustomerOtp(signinDto);
    
    if (result?.otp) {
      this.sendOTPSMS(signinDto.phone, result.otp).catch(error => {
        this.logger.error(`Failed to send OTP SMS: ${error.message}`);
      });

      result.otp = process.env.NODE_ENV === 'development' ? result.otp : undefined;
    }
    
    return result;
  }

  async resendDriverOtp(signinDto: SigninDto) {
    const result = await this.authClient.resendDriverOtp(signinDto);
    
    if (result?.otp) {
      this.sendOTPSMS(signinDto.phone, result.otp).catch(error => {
        this.logger.error(`Failed to send OTP SMS: ${error.message}`);
      });
    }
    
    return result;
  }

  private async sendOTPSMS(phone: string, otp: string): Promise<void> {
    try {
      const smsDto = new SendSMSDto();
      smsDto.messageType = MessageType.OTP;
      smsDto.message = 'OTP Verification';
      smsDto.mobileNumber = phone;
      smsDto.otpCode = otp;

      //await this.smsService.sendSMS(smsDto);
      this.logger.info(`OTP SMS sent successfully to ${phone}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP SMS to ${phone}: ${error.message}`);
      throw error;
    }
  }
}

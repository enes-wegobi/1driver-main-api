import { Injectable } from '@nestjs/common';
import { AuthClient } from '../../clients/auth/auth.client';
import { CreateCustomerDto } from '../../clients/auth/dto/create-customer.dto';
import { CreateDriverDto } from '../../clients/auth/dto/create-driver.dto';
import { ValidateOtpDto } from '../../clients/auth/dto/validate-otp.dto';
import { SigninDto } from '../../clients/auth/dto/signin.dto';
import { PaymentsService } from '../payments/services/payments.service';
import { DriverEarningsService } from '../drivers/services/driver-earnings.service';
import { LoggerService } from '../../logger/logger.service';
import { UserType } from 'src/common/user-type.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly authClient: AuthClient,
    private readonly paymentsService: PaymentsService,
    private readonly driverEarningsService: DriverEarningsService,
    private readonly logger: LoggerService,
  ) {}

  // Customer Auth Methods
  async initiateCustomerSignup(createCustomerDto: CreateCustomerDto) {
    return this.authClient.initiateCustomerSignup(createCustomerDto);
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
    return this.authClient.signinCustomer(signinDto);
  }

  async completeCustomerSignin(validateOtpDto: ValidateOtpDto) {
    return this.authClient.completeCustomerSignin(validateOtpDto);
  }

  // Driver Auth Methods
  async initiateDriverSignup(createDriverDto: CreateDriverDto) {
     return await this.authClient.initiateDriverSignup(createDriverDto);
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
    return this.authClient.signinDriver(signinDto);
  }

  async completeDriverSignin(validateOtpDto: ValidateOtpDto) {
    return this.authClient.completeDriverSignin(validateOtpDto);
  }

  // Resend OTP Methods
  async resendCustomerOtp(signinDto: SigninDto) {
    return this.authClient.resendCustomerOtp(signinDto);
  }

  async resendDriverOtp(signinDto: SigninDto) {
    return this.authClient.resendDriverOtp(signinDto);
  }
}

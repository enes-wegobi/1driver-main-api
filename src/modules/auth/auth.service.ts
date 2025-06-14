import { Injectable, Logger } from '@nestjs/common';
import { AuthClient } from '../../clients/auth/auth.client';
import { CreateCustomerDto } from '../../clients/auth/dto/create-customer.dto';
import { CreateDriverDto } from '../../clients/auth/dto/create-driver.dto';
import { ValidateOtpDto } from '../../clients/auth/dto/validate-otp.dto';
import { SigninDto } from '../../clients/auth/dto/signin.dto';
import { PaymentsService } from '../payments/services/payments.service';
import { DriverEarningsService } from '../drivers/services/driver-earnings.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authClient: AuthClient,
    private readonly paymentsService: PaymentsService,
    private readonly driverEarningsService: DriverEarningsService,
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
        this.logger.log(
          `Creating Stripe customer for user ${result.customer._id}`,
        );
        await this.paymentsService.createStripeCustomer(result.customer._id, {
          name: `${result.customer.name} ${result.customer.surname}`,
          email: result.customer.email,
          phone: result.customer.phone,
        });
        this.logger.log(
          `Successfully created Stripe customer for user ${result.customer._id}`,
        );
      } catch (error) {
        // Log error but don't fail the signup
        this.logger.error(
          `Failed to create Stripe customer: ${error.message}`,
          error.stack,
        );
      }

      return { token: result.token };
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
    return this.authClient.initiateDriverSignup(createDriverDto);
  }

  async completeDriverSignup(validateOtpDto: ValidateOtpDto) {
    const result = await this.authClient.completeDriverSignup(validateOtpDto);

    // Create initial weekly earnings record after successful driver signup
    if (result && result.token && result.driver) {
      try {
        this.logger.log(
          `Creating initial weekly earnings record for driver ${result.driver._id}`,
        );
        await this.driverEarningsService.findOrCreateCurrentWeekRecord(
          result.driver._id,
        );
        this.logger.log(
          `Successfully created initial weekly earnings record for driver ${result.driver._id}`,
        );
      } catch (error) {
        // Log error but don't fail the signup
        this.logger.error(
          `Failed to create initial weekly earnings record: ${error.message}`,
          error.stack,
        );
      }

      return { token: result.token };
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

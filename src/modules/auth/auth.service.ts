import { Injectable } from '@nestjs/common';
import { AuthClient } from '../../clients/auth/auth.client';
import { CreateCustomerDto } from '../../clients/auth/dto/create-customer.dto';
import { CreateDriverDto } from '../../clients/auth/dto/create-driver.dto';
import { ValidateOtpDto } from '../../clients/auth/dto/validate-otp.dto';
import { SigninDto } from '../../clients/auth/dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(private readonly authClient: AuthClient) {}

  // Customer Auth Methods
  async initiateCustomerSignup(createCustomerDto: CreateCustomerDto) {
    return this.authClient.initiateCustomerSignup(createCustomerDto);
  }

  async completeCustomerSignup(validateOtpDto: ValidateOtpDto) {
    return this.authClient.completeCustomerSignup(validateOtpDto);
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
    return this.authClient.completeDriverSignup(validateOtpDto);
  }

  async signinDriver(signinDto: SigninDto) {
    return this.authClient.signinDriver(signinDto);
  }

  async completeDriverSignin(validateOtpDto: ValidateOtpDto) {
    return this.authClient.completeDriverSignin(validateOtpDto);
  }
}

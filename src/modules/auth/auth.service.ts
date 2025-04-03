import { Injectable } from '@nestjs/common';
import { AuthClient } from '../../clients/auth/auth.client';
import { CreateCustomerDto } from '../../clients/auth/dto/create-customer.dto';
import { ValidateOtpDto } from '../../clients/auth/dto/validate-otp.dto';
import { SigninDto } from '../../clients/auth/dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(private readonly authClient: AuthClient) {}

  async initiateCustomerSignup(createCustomerDto: CreateCustomerDto) {
    return this.authClient.initiateCustomerSignup(createCustomerDto);
  }

  async completeCustomerSignup(validateOtpDto: ValidateOtpDto) {
    return this.authClient.completeCustomerSignup(validateOtpDto);
  }

  async signinCustomer(signinDto: SigninDto) {
    return this.authClient.signinCustomer(signinDto);
  }
}
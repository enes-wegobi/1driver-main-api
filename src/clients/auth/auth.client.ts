import { Injectable } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ValidateOtpDto } from './dto/validate-otp.dto';
import { SigninDto } from './dto/signin.dto';
import { CreateDriverDto } from './dto/create-driver.dto';

@Injectable()
export class AuthClient {
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('auth');
  }

  // Customer Auth Methods
  async initiateCustomerSignup(
    createCustomerDto: CreateCustomerDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/customer/initiate-signup',
      createCustomerDto,
    );
    return data;
  }

  async completeCustomerSignup(validateOtpDto: ValidateOtpDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/customer/complete-signup',
      validateOtpDto,
    );
    return data;
  }

  async signinCustomer(signinDto: SigninDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/customer/initiate-sign-in',
      signinDto,
    );
    return data;
  }

  async completeCustomerSignin(validateOtpDto: ValidateOtpDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/customer/complete-sign-in',
      validateOtpDto,
    );
    return data;
  }

  // Driver Auth Methods
  async initiateDriverSignup(createDriverDto: CreateDriverDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/driver/initiate-signup',
      createDriverDto,
    );
    return data;
  }

  async completeDriverSignup(validateOtpDto: ValidateOtpDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/driver/complete-signup',
      validateOtpDto,
    );
    return data;
  }

  async signinDriver(signinDto: SigninDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/driver/initiate-sign-in',
      signinDto,
    );
    return data;
  }

  async completeDriverSignin(validateOtpDto: ValidateOtpDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/driver/complete-sign-in',
      validateOtpDto,
    );
    return data;
  }

  // Resend OTP Methods
  async resendCustomerOtp(signinDto: SigninDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/customer/resend-otp',
      signinDto,
    );
    return data;
  }

  async resendDriverOtp(signinDto: SigninDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/driver/resend-otp',
      signinDto,
    );
    return data;
  }
}

import { ApiProperty } from '@nestjs/swagger';

export class ResetCodeResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Verification code sent to your email',
  })
  message: string;

  @ApiProperty({
    description: 'Email address where code was sent',
    example: 'admin@1driver.com',
  })
  email: string;
}

export class VerifyCodeResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Verification code is valid',
  })
  message: string;

  @ApiProperty({
    description: 'Indicates code verification success',
    example: true,
  })
  verified: boolean;
}

export class ResetPasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password has been successfully reset',
  })
  message: string;
}
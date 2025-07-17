import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { MessageType } from '../enums/message-type.enum';

export class SendSMSDto {
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsEnum(MessageType)
  messageType: MessageType;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @IsOptional()
  @IsString()
  otpCode?: string;

  @IsOptional()
  @IsBoolean()
  isUnicode?: boolean;

  @IsOptional()
  @IsBoolean()
  isFlash?: boolean;

  @IsOptional()
  @IsString()
  scheduleTime?: string;
}
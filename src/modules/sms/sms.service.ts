import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { LoggerService } from 'src/logger/logger.service';
import { SendSMSDto } from './dto/send-sms.dto';
import {
  SMSResponseDto,
  SendSMSResponseDto,
  MessageStatusResponseDto,
} from './dto/sms-response.dto';
import {
  SMSApiResponse,
  SendSMSResult,
  MessageStatusData,
  SMSConfig,
} from './sms.interface';
import { OTPTemplate } from './templates/otp-template';
import { MessageType } from './enums/message-type.enum';

@Injectable()
export class SMSService implements OnModuleInit {
  private httpClient: AxiosInstance;
  private config: SMSConfig;
  private smsEnabled = false;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const apiKey = this.configService.get<string>('sms.apiKey');
      const clientId = this.configService.get<string>('sms.clientId');
      const baseUrl =
        this.configService.get<string>('sms.baseUrl') ||
        'https://user.digitizebirdsms.com/api/v2';

      if (!apiKey || !clientId) {
        this.logger.warn(
          'SMS API credentials not provided. SMS service will be disabled.',
        );
        this.smsEnabled = false;
        return;
      }

      this.config = {
        apiKey,
        clientId,
        baseUrl,
      };

      this.httpClient = axios.create({
        baseURL: this.config.baseUrl,
        timeout: 30000,
      });

      this.smsEnabled = true;
      this.logger.info('SMS service initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize SMS service: ${error.message}`);
      this.smsEnabled = false;
    }
  }

  async sendSMS(dto: SendSMSDto): Promise<SMSResponseDto> {
    if (!this.smsEnabled) {
      this.logger.warn('SMS service is not enabled. Message not sent.');
      return new SMSResponseDto(-1, 'SMS service is not enabled', null);
    }

    try {
      let finalMessage = dto.message;

      // OTP type ise template kullan
      if (dto.messageType === MessageType.OTP && dto.otpCode) {
        const expiryMinutes =
          this.configService.get<number>('sms.otpExpiryMinutes') || 5;
        finalMessage = OTPTemplate.formatMessage(dto.otpCode, expiryMinutes);
      }

      const params = {
        ApiKey: this.config.apiKey!,
        ClientId: this.config.clientId!,
        SenderId:
          dto.senderId ||
          this.configService.get<string>('sms.senderId') ||
          'DRIVER',
        Message: finalMessage,
        MobileNumbers: dto.mobileNumber.replace(/^\+/, ''),
      };

      if (dto.isUnicode !== undefined) {
        params['Is_Unicode'] = dto.isUnicode;
      }

      if (dto.isFlash !== undefined) {
        params['Is_Flash'] = dto.isFlash;
      }

      if (dto.scheduleTime) {
        params['ScheduleTime'] = dto.scheduleTime;
      }

      const response = await this.httpClient.get('/SendSMS', { params });
      const apiResponse: SMSApiResponse<SendSMSResult[]> = response.data;

      if (apiResponse.ErrorCode !== 0) {
        this.logger.error(`SMS API error: ${apiResponse.ErrorDescription}`);
        return new SMSResponseDto(
          apiResponse.ErrorCode,
          apiResponse.ErrorDescription,
          null,
        );
      }

      const result = apiResponse.Data[0];
      const responseData = new SendSMSResponseDto(
        result.MobileNumber,
        result.MessageId,
      );

      this.logger.info(
        `SMS sent successfully to ${result.MobileNumber}, MessageId: ${result.MessageId}`,
      );
      return new SMSResponseDto(0, 'Success', responseData);
    } catch (error) {
      this.logger.error(`Error sending SMS: ${error.message}`);
      return new SMSResponseDto(
        -1,
        `Failed to send SMS: ${error.message}`,
        null,
      );
    }
  }

  async getMessageStatus(messageId: string): Promise<SMSResponseDto> {
    if (!this.smsEnabled) {
      this.logger.warn(
        'SMS service is not enabled. Cannot get message status.',
      );
      return new SMSResponseDto(-1, 'SMS service is not enabled', null);
    }

    try {
      const params = {
        ApiKey: this.config.apiKey!,
        ClientId: this.config.clientId!,
        MessageId: messageId,
      };

      const response = await this.httpClient.get('/MessageStatus', { params });
      const apiResponse: SMSApiResponse<MessageStatusData> = response.data;

      if (apiResponse.ErrorCode !== 0) {
        this.logger.error(`SMS API error: ${apiResponse.ErrorDescription}`);
        return new SMSResponseDto(
          apiResponse.ErrorCode,
          apiResponse.ErrorDescription,
          null,
        );
      }

      const responseData = new MessageStatusResponseDto(apiResponse.Data);
      this.logger.debug(`Message status retrieved for MessageId: ${messageId}`);
      return new SMSResponseDto(0, 'Success', responseData);
    } catch (error) {
      this.logger.error(`Error getting message status: ${error.message}`);
      return new SMSResponseDto(
        -1,
        `Failed to get message status: ${error.message}`,
        null,
      );
    }
  }
}

export interface SMSApiResponse<T = any> {
  ErrorCode: number;
  ErrorDescription: string;
  Data: T;
}

export interface SendSMSResult {
  MobileNumber: string;
  MessageId: string;
}

export interface MessageStatusData {
  MobileNumber: string;
  SenderId: string;
  Message: string;
  SubmitDate: string;
  MessageId: string;
  DoneDate: string;
  Status: string;
}

export interface SMSConfig {
  apiKey?: string;
  clientId?: string;
  baseUrl?: string;
}
export class SMSResponseDto {
  errorCode: number;
  errorDescription: string;
  data: any;

  constructor(errorCode: number, errorDescription: string, data: any) {
    this.errorCode = errorCode;
    this.errorDescription = errorDescription;
    this.data = data;
  }
}

export class SendSMSResponseDto {
  mobileNumber: string;
  messageId: string;

  constructor(mobileNumber: string, messageId: string) {
    this.mobileNumber = mobileNumber;
    this.messageId = messageId;
  }
}

export class MessageStatusResponseDto {
  mobileNumber: string;
  senderId: string;
  message: string;
  submitDate: string;
  messageId: string;
  doneDate: string;
  status: string;

  constructor(data: any) {
    this.mobileNumber = data.MobileNumber;
    this.senderId = data.SenderId;
    this.message = data.Message;
    this.submitDate = data.SubmitDate;
    this.messageId = data.MessageId;
    this.doneDate = data.DoneDate;
    this.status = data.Status;
  }
}

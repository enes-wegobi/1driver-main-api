import { Injectable, Logger } from '@nestjs/common';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { UserType } from 'src/common/user-type.enum';

@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(private readonly customersClient: CustomersClient) {}

  async create(
    userId: string,
    userType: UserType,
    subject: string,
    description: string,
    fileUrl: string | null,
  ) {
    this.logger.log(
      `Creating support ticket for ${userType} ${userId} with subject ${subject}`,
    );

    // Send the support ticket data to the customer client
    // The backend service will handle both customer and driver support tickets
    return this.customersClient.createSupportTicket(
      userId,
      subject,
      description,
      fileUrl,
      userType,
    );
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { CustomersClient } from 'src/clients/customer/customers.client';

@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(private readonly customersClient: CustomersClient) {}

  async create(
    customerId: string,
    subject: string,
    description: string,
    fileKey: string | null,
    fileUrl: string | null,
  ) {
    this.logger.log(
      `Creating support ticket for customer ${customerId} with subject ${subject}`,
    );

    // Send the support ticket data to the customer client
    return this.customersClient.createSupportTicket(
      customerId,
      subject,
      description,
      fileKey,
    );
  }
}

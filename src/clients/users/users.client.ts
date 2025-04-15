import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { CreateUserDto, UpdateUserDto, User } from './users.interfaces';
import { NotifyFileUploadedDto } from './dto/notify-file-uploaded.dto';

@Injectable()
export class UsersClient {
  private readonly logger = new Logger(UsersClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('users');
  }

  async findAll(): Promise<User[]> {
    const { data } = await this.httpClient.get<User[]>('/users');
    return data;
  }

  async findOne(id: string): Promise<User> {
    const { data } = await this.httpClient.get<User>(`/customers/${id}`);
    return data;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { data } = await this.httpClient.post<User>('/users', createUserDto);
    return data;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const { data } = await this.httpClient.patch<User>(
      `/users/${id}`,
      updateUserDto,
    );
    return data;
  }

  async remove(id: string): Promise<void> {
    await this.httpClient.delete(`/users/${id}`);
  }

  async notifyFileUploaded(
    notificationDto: NotifyFileUploadedDto,
  ): Promise<void> {
    try {
      const endpoint = '/users/notify-file-upload';
      this.logger.log(
        `Sending file upload notification to User API: ${endpoint} for user ${notificationDto.userId}`,
      );
      await this.httpClient.post(endpoint, notificationDto);
      this.logger.log(
        `Successfully notified User API for user ${notificationDto.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify User API about file upload for user ${notificationDto.userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

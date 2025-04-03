import { Injectable } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { CreateUserDto, UpdateUserDto, User } from './users.interfaces';

@Injectable()
export class UsersClient {
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
}

import { Injectable } from '@nestjs/common';
import { UsersClient } from 'src/clients/users/users.client';
import {
  CreateUserDto,
  UpdateUserDto,
  User,
} from 'src/clients/users/users.interfaces';

@Injectable()
export class UsersService {
  constructor(private readonly usersClient: UsersClient) {}

  async findAll(): Promise<User[]> {
    return this.usersClient.findAll();
  }

  async findOne(id: string): Promise<User> {
    return this.usersClient.findOne(id);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.usersClient.create(createUserDto);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    return this.usersClient.update(id, updateUserDto);
  }

  async remove(id: string): Promise<void> {
    return this.usersClient.remove(id);
  }
}

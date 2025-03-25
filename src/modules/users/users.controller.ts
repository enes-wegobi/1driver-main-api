import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  User,
} from 'src/clients/users/users.interfaces';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    try {
      return await this.usersService.create(createUserDto);
    } catch (error) {
      this.logger.error(`User creation error: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred while creating the user',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(): Promise<User[]> {
    try {
      return await this.usersService.findAll();
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred while fetching users',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    try {
      return await this.usersService.findOne(id);
    } catch (error) {
      this.logger.error(`Error fetching user: ${error.message}`, error.stack);

      throw new HttpException(
        error.response?.data || 'An error occurred while fetching the user',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    try {
      return await this.usersService.update(id, updateUserDto);
    } catch (error) {
      this.logger.error(`User update error: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred while updating the user',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    try {
      return await this.usersService.remove(id);
    } catch (error) {
      this.logger.error(`User deletion error: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred while deleting the user',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

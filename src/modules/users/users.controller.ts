import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get('profile/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user) {
    try {
      this.logger.log(`Getting profile for user ID: ${user.userId}`);
      return await this.usersService.findOne(user.userId);
    } catch (error) {
      this.logger.error(`Error fetching profile: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred while fetching the profile',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

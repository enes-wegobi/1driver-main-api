import {
  Controller,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  HttpException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from 'src/clients/customer/dto/update-customer.dto';
import { InitiateEmailUpdateDto } from 'src/clients/customer/dto/initiate-email-update.dto';
import { CompleteEmailUpdateDto } from 'src/clients/customer/dto/complete-email-update.dto';
import { InitiatePhoneUpdateDto } from 'src/clients/customer/dto/initiate-phone-update.dto';
import { CompletePhoneUpdateDto } from 'src/clients/customer/dto/complete-phone-update.dto';
import { GetUser } from 'src/jwt/user.decoretor';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user) {
    try {
      this.logger.log(`Getting profile for user ID: ${user.userId}`);
      return await this.customersService.findOne(user.userId);
    } catch (error) {
      this.logger.error(
        `Error fetching profile: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while fetching the profile',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer profile information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async updateProfile(@Body() profileData: UpdateCustomerDto, @GetUser() user) {
    try {
      return await this.customersService.updateProfile(
        user.userId,
        profileData,
      );
    } catch (error) {
      this.logger.error(
        `Error updating profile: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while updating profile',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Deleted successfully' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async remove(@GetUser() user) {
    try {
      return await this.customersService.remove(user.userId);
    } catch (error) {
      this.logger.error(
        `Error deleting customer: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while deleting customer',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('initiate-email-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate email update process' })
  @ApiResponse({ status: HttpStatus.OK, description: 'OTP sent to new email' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already in use or same as current',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID',
  })
  async initiateEmailUpdate(
    @GetUser() user,
    @Body() dto: InitiateEmailUpdateDto,
  ) {
    try {
      return await this.customersService.initiateEmailUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error initiating email update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while initiating email update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-email-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete email update with OTP verification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid OTP or user ID',
  })
  async completeEmailUpdate(
    @GetUser() user,
    @Body() dto: CompleteEmailUpdateDto,
  ) {
    try {
      return await this.customersService.completeEmailUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error completing email update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while completing email update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('initiate-phone-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate phone update process' })
  @ApiResponse({ status: HttpStatus.OK, description: 'OTP sent to new phone' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Phone already in use or same as current',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID',
  })
  async initiatePhoneUpdate(
    @GetUser() user,
    @Body() dto: InitiatePhoneUpdateDto,
  ) {
    try {
      return await this.customersService.initiatePhoneUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error initiating phone update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while initiating phone update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-phone-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete phone update with OTP verification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Phone updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid OTP or user ID',
  })
  async completePhoneUpdate(
    @GetUser() user,
    @Body() dto: CompletePhoneUpdateDto,
  ) {
    try {
      return await this.customersService.completePhoneUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error completing phone update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while completing phone update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

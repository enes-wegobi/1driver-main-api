import {
  Controller,
  Get,
  UseGuards,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { CreateTripDto } from './dto/create-trip.dto';
import { UserType } from 'src/common/user-type.enum';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';

@ApiTags('customer-trips')
@Controller('customer-trips')
export class CustomersTripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createTrip(
    @Body() createTripDto: CreateTripDto,
    @GetUser() user: IJwtPayload,
  ) {
    if (user.userType !== UserType.CUSTOMER) {
      throw new HttpException(
        'Only customers can create trips',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.userId !== createTripDto.customerId) {
      throw new HttpException(
        'You can only create trips for yourself',
        HttpStatus.FORBIDDEN,
      );
    }

    return await this.tripsService.createTrip(createTripDto);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getTripById(
    @Param('tripId') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripsService.getCustomerActiveTrip(user.userId);
  }

  @Post('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateTripStatus(@GetUser() user: IJwtPayload) {
    //return await this.tripsService.updateTripStatus(user.userId);
  }
  /*
  @Post(':tripId/create-room')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a trip room for real-time location sharing',
  })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiResponse({ status: 200, description: 'Trip room created successfully' })
  async createTripRoom(@Param('tripId') tripId: string, @GetUser() user: any) {
    // Get trip to check permissions
    const trip = await this.tripsService.getTripById(tripId);

    // Only the customer or assigned driver can create a trip room
    if (user.userId !== trip.customerId && user.userId !== trip.driverId) {
      throw new HttpException(
        'You do not have permission to create a room for this trip',
        HttpStatus.FORBIDDEN,
      );
    }

    const success = await this.tripsService.createTripRoom(tripId);

    return {
      success,
      message: success
        ? 'Trip room created successfully'
        : 'Failed to create trip room',
    };
  }
    */
}

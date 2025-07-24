import {
  Controller,
  Get,
  UseGuards,
  Post,
  Body,
  Query,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/guards/jwt.guard';
import { GetUser } from 'src/jwt/user.decorator';
import { EstimateTripDto } from '../dto/estimate-trip.dto';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { TripService } from '../services/trip.service';
import { TripPaymentService } from '../services/trip-payment.service';
import { ProcessTripPaymentDto } from '../dto/process-trip-payment.dto';
import { TripHistoryQueryDto } from '../dto/trip-history-query.dto';
import { TripHistoryResponseDto } from '../dto/trip-history-response.dto';
import { AddTripCommentDto } from '../dto/add-trip-comment.dto';
import { UpdateRateDto } from 'src/common/dto/update-rate.dto';
import { RequestDriverDto } from '../dto/request-driver.dto';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { UserType } from 'src/common/user-type.enum';
import { ActiveTripService } from 'src/redis/services/active-trip.service';

@ApiTags('customer-trips')
@Controller('customer-trips')
export class CustomersTripsController {
  constructor(
    private readonly tripService: TripService,
    private readonly tripPaymentService: TripPaymentService,
    private readonly activeTripService: ActiveTripService,
  ) {}

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getTripById(@GetUser() user: IJwtPayload) {
    return await this.tripService.getCustomerActiveTrip(user.userId);
  }

  @Get('nearby-drivers')
  @ApiOperation({ summary: 'Get available drivers near a specific location' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({
    name: 'latitude',
    description: 'Latitude coordinate',
    required: true,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Longitude coordinate',
    required: true,
  })
  async getNearbyAvailableDrivers(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
  ) {
    const drivers = await this.tripService.getNearbyAvailableDrivers(
      latitude,
      longitude,
    );
    return {
      total: drivers.length,
      drivers,
    };
  }

  @Post('create-draft')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a draft trip with fare and duration estimate',
  })
  @ApiBody({ type: EstimateTripDto })
  async createDraft(
    @Body() estimateTripDto: EstimateTripDto,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripService.estimate(estimateTripDto, user.userId);
  }

  @Post('request-driver')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a driver for a trip' })
  @ApiBody({ type: RequestDriverDto })
  async requestDriver(
    @Body() requestDriverDto: RequestDriverDto,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripService.requestDriver(
      user.userId,
      requestDriverDto.tripId,
    );
  }

  @Post('process-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Process payment for active trip',
    description:
      "Process payment for the customer's active trip using the specified payment method",
  })
  @ApiBody({ type: ProcessTripPaymentDto })
  async processPayment(
    @Body() processPaymentDto: ProcessTripPaymentDto,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripPaymentService.processTripPayment(
      user.userId,
      processPaymentDto.paymentMethodId,
    );
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel the active trip' })
  async cancelTrip(@GetUser() user: IJwtPayload) {
    return await this.tripService.cancelTripByCustomer(user.userId);
  }

  @Post('retry-cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retry cancelling the active trip',
    description:
      'Retry the trip cancellation process when penalty payment failed. This endpoint can be used when the trip is in CANCELLED_PAYMENT or PAYMENT_RETRY status. Optionally provide a payment method ID, otherwise default payment method will be used.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentMethodId: {
          type: 'string',
          description:
            'Optional payment method ID. If not provided, default payment method will be used.',
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Trip cancellation retry completed successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Trip not in cancelled payment status or penalty payment retry failed',
  })
  async retryCancelTrip(
    @GetUser() user: IJwtPayload,
    @Body() body?: { paymentMethodId?: string },
  ) {
    return await this.tripService.retryCancelTripByCustomer(
      user.userId,
      body?.paymentMethodId,
    );
  }

  @Post('cancel-request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel pending trip request to drivers' })
  async cancelTripRequest(@GetUser() user: IJwtPayload) {
    return await this.tripService.cancelTripRequest(user.userId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get customer trip history',
    description:
      'Retrieve paginated trip history for the authenticated customer with filtering and sorting options',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip history retrieved successfully',
    type: TripHistoryResponseDto,
  })
  async getTripHistory(
    @Query() queryOptions: TripHistoryQueryDto,
    @GetUser() user: IJwtPayload,
  ): Promise<TripHistoryResponseDto> {
    return await this.tripService.getCustomerTripHistory(
      user.userId,
      queryOptions,
    );
  }

  @Patch(':id/rate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rate a completed trip',
    description:
      'Rate a completed trip and update driver rating. Only the customer who took the trip can rate it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Trip ID',
    type: 'string',
  })
  @ApiBody({ type: UpdateRateDto })
  @ApiResponse({
    status: 200,
    description: 'Trip rated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Trip not found, unauthorized access, or trip not completed',
  })
  async rateTrip(
    @Param('id') tripId: string,
    @Body() updateRateDto: UpdateRateDto,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripService.rateTrip(
      tripId,
      user.userId,
      updateRateDto.rate,
    );
  }

  @Post(':id/comment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add comment to a completed trip',
    description:
      'Add a comment to a completed trip. Only the customer who took the trip can add a comment.',
  })
  @ApiParam({
    name: 'id',
    description: 'Trip ID',
    type: 'string',
  })
  @ApiBody({ type: AddTripCommentDto })
  @ApiResponse({
    status: 200,
    description: 'Comment added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Trip not found, unauthorized access, or trip not completed',
  })
  async addComment(
    @Param('id') tripId: string,
    @Body() addCommentDto: AddTripCommentDto,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripService.addCustomerComment(
      tripId,
      user.userId,
      addCommentDto.comment,
    );
  }

  @Delete('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete active trip if driver not found',
    description:
      "Delete the customer's active trip if it has DRIVER_NOT_FOUND status. This will remove the trip from active state and move it to draft status.",
  })
  @ApiResponse({
    status: 200,
    description: 'Active trip deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'No active trip found or trip cannot be deleted (wrong status)',
  })
  @ApiResponse({
    status: 404,
    description: 'No active trip found for customer',
  })
  async deleteActiveTrip(@GetUser() user: IJwtPayload) {
    const activeTrip = await this.tripService.getCustomerActiveTrip(
      user.userId,
    );

    if (!activeTrip.trip) {
      throw new Error('No active trip found');
    }

    if (activeTrip.trip.status !== TripStatus.DRIVER_NOT_FOUND) {
      throw new Error(
        'Trip can only be deleted when status is DRIVER_NOT_FOUND',
      );
    }

    await this.tripService.updateTripStatus(
      activeTrip.trip._id,
      TripStatus.DRAFT,
    );

    await this.activeTripService.removeUserActiveTrip(
      user.userId,
      UserType.CUSTOMER,
    );
    return {
      message: 'Active trip deleted successfully',
      tripId: activeTrip.trip._id,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get trip details by ID',
    description:
      'Get detailed information about a specific trip by its ID. Customer can only access their own trips.',
  })
  @ApiParam({
    name: 'id',
    description: 'Trip ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip details retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Trip not found or unauthorized access',
  })
  async getTripDetail(
    @Param('id') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripService.getTripDetailForCustomer(tripId, user.userId);
  }
}

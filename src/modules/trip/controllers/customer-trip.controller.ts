import {
  Controller,
  Get,
  UseGuards,
  Post,
  Body,
  Query,
  Param,
  Patch,
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
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { EstimateTripDto } from '../dto/estimate-trip.dto';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { RequestDriverDto } from '../../trips/dto/request-driver.dto';
import { TripService } from '../services/trip.service';
import { TripPaymentService } from '../services/trip-payment.service';
import { ProcessTripPaymentDto } from '../dto/process-trip-payment.dto';
import { TripHistoryQueryDto } from '../dto/trip-history-query.dto';
import { TripHistoryResponseDto } from '../dto/trip-history-response.dto';
import { AddTripCommentDto } from '../dto/add-trip-comment.dto';
import { UpdateRateDto } from 'src/common/dto/update-rate.dto';

@ApiTags('customer-trips')
@Controller('customer-trips')
export class CustomersTripsController {
  constructor(
    private readonly tripService: TripService,
    private readonly tripPaymentService: TripPaymentService,
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
      requestDriverDto.tripId,
      requestDriverDto.lat,
      requestDriverDto.lon,
      user.userId,
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

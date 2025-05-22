import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { TripService } from './trip.service';
import { EstimateTripDto } from './dto/estimate-trip.dto';
import { CallDriversDto } from './dto/call-drivers.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { ApiTags, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';
import { ConfigService } from 'src/config/config.service';
import { MapsService } from 'src/clients/maps/maps.service';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';

@ApiTags('trips')
@Controller('trips')
export class TripController {
  constructor(
    private readonly tripService: TripService,
    private readonly mapsService: MapsService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Estimate trip cost and distance' })
  @ApiBody({ type: EstimateTripDto })
  @Post('estimate')
  async estimateTrip(@Body() estimateTripDto: EstimateTripDto) {
    // Get distance matrix from Maps service
    const distanceMatrix = await this.mapsService.getDistanceMatrix(
      estimateTripDto.route,
    );

    if (
      !distanceMatrix.success ||
      !distanceMatrix.duration ||
      !distanceMatrix.distance
    ) {
      return {
        success: false,
        message: distanceMatrix.message || 'Failed to calculate distance',
      };
    }

    // Calculate estimated cost based on duration
    const durationInMinutes = distanceMatrix.duration.value / 60;
    const costPerMinute = this.configService.tripCostPerMinute;
    const estimatedCost =
      Math.round(durationInMinutes * costPerMinute * 100) / 100;

    // Create a trip record
    const trip = await this.tripService.createTrip(
      {
        status: TripStatus.DRAFT,
        paymentStatus: PaymentStatus.UNPAID,
        route: estimateTripDto.route,
        estimatedDistance: distanceMatrix.distance.value,
        estimatedDuration: distanceMatrix.duration.value,
        estimatedCost,
      },
      estimateTripDto.customerId,
    );

    return {
      success: true,
      trip: trip,
    };
  }

  @ApiOperation({ summary: 'Call drivers for a trip' })
  @ApiBody({ type: CallDriversDto })
  @Post(':tripId/request-driver')
  async callDrivers(
    @Param('tripId') tripId: string,
    @Body() callDriversDto: CallDriversDto,
  ) {
    const result = await this.tripService.callDrivers(
      tripId,
      callDriversDto.customerId,
      callDriversDto.driverIds,
    );

    if (!result.success || !result.trip) {
      return {
        success: false,
        message: result.message || 'Failed to call drivers',
      };
    }

    return result;
  }

  @ApiOperation({ summary: 'Get trip by ID' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @Get(':tripId')
  async getTrip(@Param('tripId') tripId: string) {
    const trip = await this.tripService.findTrip(tripId);

    if (!trip) {
      return {
        success: false,
        message: 'Trip not found',
      };
    }

    return {
      success: true,
      trip,
    };
  }

  @ApiOperation({ summary: 'Update trip' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiBody({ type: UpdateTripDto })
  @Post(':tripId/update')
  async updateTrip(
    @Param('tripId') tripId: string,
    @Body() updateTripDto: UpdateTripDto,
  ) {
    const result = await this.tripService.updateTrip(tripId, updateTripDto);

    if (!result.success || !result.trip) {
      return {
        success: false,
        message: result.message || 'Failed to update trip',
      };
    }

    return {
      success: true,
      trip: result.trip,
    };
  }

  @ApiOperation({ summary: 'Approve trip' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiBody({
    type: Object,
    schema: {
      properties: {
        driverId: { type: 'string' },
      },
    },
  })
  @Post(':tripId/approve')
  async approveTrip(
    @Param('tripId') tripId: string,
    @Body('driverId') driverId: string,
  ) {
    const result = await this.tripService.approveTrip(tripId, driverId);

    if (!result.success || !result.trip) {
      return {
        success: false,
        message: result.message || 'Failed to approve trip',
      };
    }

    return {
      success: true,
      trip: result.trip,
    };
  }

  @ApiOperation({ summary: 'Decline trip with driver' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiBody({
    type: Object,
    schema: {
      properties: {
        driverId: { type: 'string' },
      },
    },
  })
  @Post(':tripId/decline')
  async declineTrip(
    @Param('tripId') tripId: string,
    @Body('driverId') driverId: string,
  ) {
    const result = await this.tripService.rejectDriver(tripId, driverId);

    if (!result.success || !result.trip) {
      return {
        success: false,
        message: result.message || 'Failed to decline trip',
      };
    }

    return {
      success: true,
      trip: result.trip,
    };
  }

  @ApiOperation({ summary: 'Get active trip for driver' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @Post('active/drivers/:driverId')
  async getDriverActiveTrip(@Param('driverId') driverId: string) {
    return await this.tripService.findActiveByDriverId(driverId);
  }

  @ApiOperation({ summary: 'Get active trip for customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @Post('active/customers/:customerId')
  async getCustomerActiveTrip(@Param('customerId') customerId: string) {
    return await this.tripService.findActiveByCustomerId(customerId);
  }

  @ApiOperation({ summary: 'Update trip status' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiBody({ type: UpdateTripStatusDto })
  @Post(':tripId/update-status')
  async updateTripStatus(
    @Param('tripId') tripId: string,
    @Body() updateTripStatusDto: UpdateTripStatusDto,
  ) {
    const result = await this.tripService.updateTripStatus(
      tripId,
      updateTripStatusDto.status,
    );

    if (!result.success || !result.trip) {
      return {
        success: false,
        message: result.message || 'Failed to update trip status',
      };
    }

    return {
      success: true,
      trip: result.trip,
    };
  }

  @ApiOperation({ summary: 'Set driver on way to pickup' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @Post(':tripId/start-pickup')
  async setDriverOnWayToPickup(@Param('tripId') tripId: string) {
    const result = await this.tripService.updateTripStatus(
      tripId,
      TripStatus.DRIVER_ON_WAY_TO_PICKUP,
    );

    if (!result.success || !result.trip) {
      return {
        success: false,
        message:
          result.message || 'Failed to update trip status to driver on way',
      };
    }

    return {
      success: true,
      trip: result.trip,
    };
  }

  @ApiOperation({ summary: 'Set driver arrived at pickup' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @Post(':tripId/reach-pickup')
  async setDriverArrivedAtPickup(@Param('tripId') tripId: string) {
    const result = await this.tripService.updateTripStatus(
      tripId,
      TripStatus.ARRIVED_AT_PICKUP,
    );

    if (!result.success || !result.trip) {
      return {
        success: false,
        message:
          result.message || 'Failed to update trip status to arrived at pickup',
      };
    }

    return {
      success: true,
      trip: result.trip,
    };
  }

  @ApiOperation({ summary: 'Set trip in progress' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @Post(':tripId/begin-trip')
  async setTripInProgress(@Param('tripId') tripId: string) {
    const result = await this.tripService.updateTripStatus(
      tripId,
      TripStatus.TRIP_IN_PROGRESS,
    );

    if (!result.success || !result.trip) {
      return {
        success: false,
        message:
          result.message || 'Failed to update trip status to in progress',
      };
    }

    return {
      success: true,
      trip: result.trip,
    };
  }

  @ApiOperation({ summary: 'Complete trip' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @Post(':tripId/complete')
  async completeTrip(@Param('tripId') tripId: string) {
    const result = await this.tripService.updateTripStatus(
      tripId,
      TripStatus.COMPLETED,
    );

    if (!result.success || !result.trip) {
      return {
        success: false,
        message: result.message || 'Failed to update trip status to completed',
      };
    }

    return {
      success: true,
      trip: result.trip,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { EstimateTripDto } from 'src/modules/trips/dto/estimate-trip.dto';
import { UpdateTripStatusDto } from 'src/modules/trips/dto/update-trip-status.dto';
import { NearbyDriversResponseDto } from 'src/modules/trips/dto/nearby-drivers-response.dto';
import { TripResponseDto, UpdateTripStatusResponseDto } from './dto';
import { FindNearbyUsersResult } from 'src/redis/dto/nearby-user.dto';

@Injectable()
export class TripClient {
  private readonly logger = new Logger(TripClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('trip');
  }

  async getTripById(tripId: string): Promise<TripResponseDto> {
    this.logger.log(`Getting trip details for ID: ${tripId}`);
    const { data } = await this.httpClient.get(`/trips/${tripId}`);
    return data;
  }

  async updateTripStatus(
    updateDto: UpdateTripStatusDto,
  ): Promise<UpdateTripStatusResponseDto> {
    this.logger.log(
      `Updating trip ${updateDto.tripId} status to ${updateDto.status}`,
    );
    const { data } = await this.httpClient.patch(
      `/trips/${updateDto.tripId}/status`,
      updateDto,
    );
    return data;
  }

  async getUserActiveTrips(
    userId: string,
    userType: 'customer' | 'driver',
  ): Promise<{ total: number; trips: TripResponseDto[] }> {
    this.logger.log(`Getting active trips for ${userType} ${userId}`);
    const { data } = await this.httpClient.get(
      `/trips/${userType}/${userId}/active`,
    );
    return data;
  }

  async getUserTrips(
    userId: string,
    userType: 'customer' | 'driver',
    page: number = 1,
    limit: number = 10,
  ): Promise<{ total: number; trips: TripResponseDto[] }> {
    this.logger.log(
      `Getting trips for ${userType} ${userId}, page ${page}, limit ${limit}`,
    );
    const { data } = await this.httpClient.get(
      `/trips/${userType}/${userId}?page=${page}&limit=${limit}`,
    );
    return data;
  }

  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radius: number = 5,
  ): Promise<NearbyDriversResponseDto> {
    this.logger.log(
      `Finding nearby drivers at [${latitude}, ${longitude}] with radius ${radius}km`,
    );
    const { data } = await this.httpClient.get(
      `/drivers/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`,
    );
    return data;
  }

  async createTripRoom(
    tripId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Creating trip room for trip: ${tripId}`);
    const { data } = await this.httpClient.post(`/trips/${tripId}/room`);
    return data;
  }

  async cancelTrip(
    tripId: string,
    userId: string,
    userType: 'customer' | 'driver',
    reason: string,
  ): Promise<any> {
    this.logger.log(`Cancelling trip ${tripId} by ${userType} ${userId}`);
    const { data } = await this.httpClient.post(`/trips/${tripId}/cancel`, {
      userId,
      userType,
      reason,
    });
    return data;
  }

  async getDriverActiveTrip(driverId: string): Promise<any> {
    const { data } = await this.httpClient.post(`/trips/active/${driverId}`);
    return data;
  }

  async getCustomerActiveTrip(customer: string): Promise<any> {
    const { data } = await this.httpClient.post(`/trips/active/${customer}`);
    return data;
  }

  async requestDriver(
    tripId: string,
    customerId: string,
    drivers: string[],
  ): Promise<any> {
    this.logger.log(
      `Requesting driver for trip: ${tripId} by customer: ${customerId}`,
    );
    const { data } = await this.httpClient.post(
      `/trips/${tripId}/request-driver`,
      {
        customerId,
        drivers,
      },
    );
    return data;
  }

  async estimateTrip(
    estimateTripDto: EstimateTripDto,
    customerId: string,
  ): Promise<any> {
    this.logger.log(`Estimating trip for customer: ${customerId}`);
    const { data } = await this.httpClient.post('/trips/estimate', {
      ...estimateTripDto,
      customerId,
    });
    return data;
  }
}

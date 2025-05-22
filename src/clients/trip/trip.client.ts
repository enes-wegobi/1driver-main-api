import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { EstimateTripDto } from 'src/modules/trips/dto/estimate-trip.dto';
import { UserType } from 'src/common/user-type.enum';
import { NearbyDriversResponseDto } from 'src/modules/trips/dto';

@Injectable()
export class TripClient {
  private readonly logger = new Logger(TripClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('trip');
  }

  async getTripById(tripId: string): Promise<any> {
    this.logger.log(`Getting trip details for ID: ${tripId}`);
    const { data } = await this.httpClient.get(`/trips/${tripId}`);
    return data;
  }

  async getUserActiveTrips(
    userId: string,
    userType: 'customer' | 'driver',
  ): Promise<{ total: number; trips: any[] }> {
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
  ): Promise<{ total: number; trips: any[] }> {
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

  async cancelTrip(userId: string, userType: UserType): Promise<any> {
    this.logger.log(`Cancelling active trip by ${userType} ${userId}`);
    const { data } = await this.httpClient.post(`/trips/cancel`, {
      userId,
      userType,
    });
    return data;
  }

  async getDriverActiveTrip(driverId: string): Promise<any> {
    const { data } = await this.httpClient.post(
      `/trips/active/drivers/${driverId}`,
    );
    return data;
  }

  async getCustomerActiveTrip(customer: string): Promise<any> {
    const { data } = await this.httpClient.post(
      `/trips/active/customers/${customer}`,
    );
    return data;
  }

  async approveTrip(tripId: string, driverId: string): Promise<any> {
    this.logger.log(`Approving trip: ${tripId} by driver: ${driverId}`);
    const { data } = await this.httpClient.post(`/trips/${tripId}/approve`, {
      driverId,
    });
    return data;
  }

  async declineTrip(tripId: string, driverId: string): Promise<any> {
    this.logger.log(`Declining trip: ${tripId} by driver: ${driverId}`);
    const { data } = await this.httpClient.post(`/trips/${tripId}/decline`, {
      driverId,
    });
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
        driverIds: drivers,
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

  async startPickup(tripId: string, driverId: string): Promise<any> {
    this.logger.log(
      `Starting pickup for trip: ${tripId} by driver: ${driverId}`,
    );
    const { data } = await this.httpClient.post(
      `/trips/${tripId}/start-pickup`,
      {
        driverId,
      },
    );
    return data;
  }

  async reachPickup(tripId: string, driverId: string): Promise<any> {
    this.logger.log(
      `Driver reached pickup for trip: ${tripId} by driver: ${driverId}`,
    );
    const { data } = await this.httpClient.post(
      `/trips/${tripId}/reach-pickup`,
      {
        driverId,
      },
    );
    return data;
  }

  async beginTrip(tripId: string, driverId: string): Promise<any> {
    this.logger.log(`Beginning trip: ${tripId} by driver: ${driverId}`);
    const { data } = await this.httpClient.post(`/trips/${tripId}/begin-trip`, {
      driverId,
    });
    return data;
  }

  async completeTrip(tripId: string, driverId: string): Promise<any> {
    this.logger.log(`Completing trip: ${tripId} by driver: ${driverId}`);
    const { data } = await this.httpClient.post(`/trips/${tripId}/complete`, {
      driverId,
    });
    return data;
  }
}

import { Injectable } from '@nestjs/common';
import { TripService } from '../../trip/services/trip.service';
import { GetAdminTripsQueryDto } from '../dto/get-admin-trips-query.dto';
import { TripDocument } from '../../trip/schemas/trip.schema';
import { AdminTripListItemDto, AdminTripListResponseDto } from '../dto/admin-trip-list-response.dto';
import { AdminTripDetailResponseDto } from '../dto/admin-trip-detail-response.dto';
import { PaymentMethodService } from '../../payments/services/payment-method.service';

@Injectable()
export class AdminTripService {
  constructor(
    private readonly tripService: TripService,
    private readonly paymentMethodService: PaymentMethodService,
  ) {}

  async getAllTrips(query: GetAdminTripsQueryDto): Promise<AdminTripListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};


    if (query.search) {
      filter.$or = [
        { 'customer.name': { $regex: query.search, $options: 'i' } },
        { 'customer.surname': { $regex: query.search, $options: 'i' } },
        { 'driver.name': { $regex: query.search, $options: 'i' } },
        { 'driver.surname': { $regex: query.search, $options: 'i' } },
      ];
    }

    const [trips, total] = await Promise.all([
      this.tripService.findAll(filter, { skip, limit }),
      this.tripService.count(filter)
    ]);

    const mappedTrips = trips.map(trip => this.mapTripToListItem(trip));

    return {
      trips: mappedTrips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getTripById(tripId: string): Promise<AdminTripDetailResponseDto | null> {
    const trip = await this.tripService.findById(tripId);

    if (!trip) {
      return null;
    }

    let paymentMethodBrand: string | undefined;
    if (trip.paymentMethodId) {
      const paymentMethod = await this.paymentMethodService.getPaymentMethodById(trip.paymentMethodId);
      paymentMethodBrand = paymentMethod?.brand;
    }

    return this.mapTripToDetail(trip, paymentMethodBrand);
  }

  private mapTripToListItem(trip: TripDocument): AdminTripListItemDto {
    return {
      id: trip._id.toString(),
      customerName: trip.customer?.name + ' ' + trip.customer?.surname,
      driverName: trip.driver?.name + ' ' + trip.driver?.surname,
      status: trip.status,
      startDate: trip.tripStartTime,
      endDate: trip.tripEndTime,
      duration: trip.actualDuration,
      finalCost: trip.finalCost,
      route: trip.route,
    };
  }

  private mapTripToDetail(trip: TripDocument, paymentMethodBrand: string | undefined): AdminTripDetailResponseDto {
    return {
      id: trip._id.toString(),
      route: trip.route,
      driver: {
        name: trip.driver.name,
        surname: trip.driver.surname,
        rate: trip.driver.rate,
      } ,
      rating: trip.rating,
      comment: trip.customerComment,
      paymentMethodBrand: paymentMethodBrand,
      finalCost: trip.finalCost,
      status: trip.status,
      paymentStatus: trip.paymentStatus,
    };
  }
}
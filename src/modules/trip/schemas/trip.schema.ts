import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RoutePoint, RoutePointSchema } from './route-point.schema';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';

export type TripDocument = Trip & Document;

@Schema({ _id: false })
export class Vehicle {
  @Prop()
  transmissionType?: string;

  @Prop()
  licensePlate?: string;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);

@Schema({ _id: false })
export class Customer {
  @Prop({ required: true })
  id: string;

  @Prop()
  name?: string;

  @Prop()
  surname?: string;

  @Prop()
  rate?: number;

  @Prop({ type: VehicleSchema })
  vehicle?: Vehicle;

  @Prop()
  photoUrl?: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

@Schema({ _id: false })
export class Driver {
  @Prop({ required: true })
  id: string;

  @Prop()
  name: string;

  @Prop()
  surname: string;

  @Prop()
  photoUrl: string;

  @Prop()
  rate: number;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);

@Schema({ timestamps: true })
export class Trip extends EntityDocumentHelper {
  @Prop({ type: CustomerSchema, required: true })
  customer: Customer;

  @Prop({ type: DriverSchema })
  driver: Driver;

  @Prop({ enum: TripStatus, default: TripStatus.DRAFT })
  status: TripStatus;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @Prop()
  paymentMethodId: string;

  @Prop()
  rating: number;

  @Prop()
  comment: string;

  @Prop({ type: [{ type: RoutePointSchema }] })
  route: RoutePoint[];

  @Prop()
  estimatedDistance: number; // meters

  @Prop()
  estimatedDuration: number; // seconds

  @Prop()
  estimatedCost: number;

  @Prop()
  actualDistance: number; // meters

  @Prop()
  actualDuration: number; // seconds

  @Prop()
  finalCost: number;

  @Prop({ type: [String], default: [] })
  calledDriverIds: string[];

  @Prop({ type: [String], default: [] })
  rejectedDriverIds: string[];

  @Prop()
  callStartTime: Date;

  @Prop({ default: 0 })
  callRetryCount: number;

  @Prop()
  tripStartTime: Date;

  @Prop()
  tripEndTime: Date;
}

export const TripSchema = SchemaFactory.createForClass(Trip);
//diğer statuleride ekle
TripSchema.index(
  { 'customer.id': 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { 
      status: { 
        $in: [
          TripStatus.WAITING_FOR_DRIVER,
          TripStatus.APPROVED,
          TripStatus.DRIVER_ON_WAY_TO_PICKUP,
          TripStatus.ARRIVED_AT_PICKUP,
          TripStatus.TRIP_IN_PROGRESS,
          TripStatus.PAYMENT
        ]
      }
    }
  },
);

TripSchema.index(
  { 'driver.id': 1, status: 1 },
  { 
    unique: true, 
    partialFilterExpression: { 
      status: { 
        $in: [
          TripStatus.APPROVED,
          TripStatus.DRIVER_ON_WAY_TO_PICKUP,
          TripStatus.ARRIVED_AT_PICKUP,
          TripStatus.TRIP_IN_PROGRESS,
          TripStatus.PAYMENT
        ]
      }
    }
  },
);
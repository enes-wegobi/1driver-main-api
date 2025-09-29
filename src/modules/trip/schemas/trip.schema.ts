import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RoutePoint, RoutePointSchema } from './route-point.schema';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { TripCustomer, TripCustomerSchema } from './trip-customer.schema';
import { TripDriver, TripDriverSchema } from './trip-driver.schema';

export type TripDocument = Trip & Document;

@Schema({ timestamps: true })
export class Trip extends EntityDocumentHelper {
  @Prop({ type: TripCustomerSchema, required: true })
  customer: TripCustomer;

  @Prop({ type: TripDriverSchema })
  driver: TripDriver;

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

  @Prop()
  customerRating: number;

  @Prop()
  customerComment: string;

  @Prop()
  driverRating: number;

  @Prop()
  driverComment: string;

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
          TripStatus.PAYMENT,
        ],
      },
    },
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
        ],
      },
    },
  },
);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { TripVehicle, TripVehicleSchema } from './trip-vehicle.schema';

@Schema({ _id: false })
export class TripCustomer {
  @Prop({ required: true })
  id: string;

  @Prop()
  name?: string;

  @Prop()
  surname?: string;

  @Prop()
  rate?: number;

  @Prop({ type: TripVehicleSchema })
  vehicle?: TripVehicle;

  @Prop()
  photoUrl?: string;
}

export const TripCustomerSchema = SchemaFactory.createForClass(TripCustomer);

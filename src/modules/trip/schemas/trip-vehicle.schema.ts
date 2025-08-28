import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class TripVehicle {
  @Prop()
  transmissionType?: string;

  @Prop()
  licensePlate?: string;
}

export const TripVehicleSchema = SchemaFactory.createForClass(TripVehicle);

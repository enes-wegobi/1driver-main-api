import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class TripDriver {
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

export const TripDriverSchema = SchemaFactory.createForClass(TripDriver);

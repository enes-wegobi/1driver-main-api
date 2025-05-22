import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoutePointDocument = RoutePoint & Document;

@Schema()
export class RoutePoint {
  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lon: number;

  @Prop({ required: true })
  name: string;
}

export const RoutePointSchema = SchemaFactory.createForClass(RoutePoint);

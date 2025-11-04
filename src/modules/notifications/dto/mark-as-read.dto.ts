import { IsMongoId } from 'class-validator';

export class MarkAsReadDto {
  @IsMongoId()
  notificationId: string;
}

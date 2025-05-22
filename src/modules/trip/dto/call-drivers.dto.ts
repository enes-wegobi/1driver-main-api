import { IsNotEmpty, IsString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CustomerDto } from './customer.dto';

export class CallDriversDto {
  @ApiProperty({
    description: 'Customer ID',
    example: '60a1b2c3d4e5f6a7b8c9d0e2',
  })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Array of driver IDs to call',
    example: ['60a1b2c3d4e5f6a7b8c9d0e3', '60a1b2c3d4e5f6a7b8c9d0e4'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  driverIds: string[];
}

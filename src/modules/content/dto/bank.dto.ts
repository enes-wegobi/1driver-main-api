import { ApiProperty } from '@nestjs/swagger';

export class BankDto {
  @ApiProperty({
    description: 'Bank ID',
    example: '1',
  })
  id: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'Emirates NBD',
  })
  name: string;
}

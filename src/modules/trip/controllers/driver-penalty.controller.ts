import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/guards/jwt.guard';
import { GetUser } from 'src/jwt/user.decorator';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { DriverPenaltyService } from '../services/driver-penalty.service';

@ApiTags('driver-penalties')
@Controller('driver-penalties')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriverPenaltyController {
  constructor(private readonly driverPenaltyService: DriverPenaltyService) {}

  @Get()
  async getDriverPenalties(@GetUser() user: IJwtPayload) {
    return await this.driverPenaltyService.getDriverPenalties(user.userId);
  }

  @Get('unpaid')
  async getUnpaidPenalties(@GetUser() user: IJwtPayload) {
    return await this.driverPenaltyService.getUnpaidPenalties(user.userId);
  }
}

import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { IJwtPayload } from './jwt-payload.interface';

export const GetUser = createParamDecorator(
  (
    data: keyof IJwtPayload | undefined,
    ctx: ExecutionContext,
  ): IJwtPayload | IJwtPayload[keyof IJwtPayload] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IJwtPayload;

    if (!user || !user.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return data ? user[data] : user;
  },
);

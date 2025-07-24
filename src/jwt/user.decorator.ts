import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { IJwtPayload } from './jwt-payload.interface';

export const GetUser = createParamDecorator(
  (
    data: keyof IJwtPayload | undefined,
    ctx: ExecutionContext,
  ): IJwtPayload | IJwtPayload[keyof IJwtPayload] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IJwtPayload;

    if (!user) {
      throw new InternalServerErrorException('User not found on request');
    }

    return data ? user[data] : user;
  },
);

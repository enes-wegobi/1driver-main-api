import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { IJwtPayload } from './jwt-payload.interface';

export const GetUser = createParamDecorator(
  (data: keyof IJwtPayload | undefined, ctx: ExecutionContext): IJwtPayload | IJwtPayload[keyof IJwtPayload] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IJwtPayload;

    if (!user) {
        console.error('GetUser decorator used without a valid user object on request.');
        throw new InternalServerErrorException('User not found on request');
    }

    return data ? user[data] : user;
  },
);

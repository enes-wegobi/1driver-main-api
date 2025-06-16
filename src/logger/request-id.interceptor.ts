import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SimpleLoggerService } from './simple-logger.service';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  constructor(private readonly logger: SimpleLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Generate or get existing request ID
    const requestId =
      request.headers['x-request-id'] || this.logger.generateRequestId();

    // Set request ID in request object for use in services
    request.requestId = requestId;

    // Set response header for client
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        // Log the request
        this.logger.logRequest(
          request.method,
          request.url,
          response.statusCode,
          duration,
          {
            requestId,
            userId: request.user?.id,
            userType: request.user?.type,
          },
        );
      }),
    );
  }
}

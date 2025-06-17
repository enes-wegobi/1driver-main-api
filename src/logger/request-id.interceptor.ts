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
    // Check if this is an HTTP context
    const contextType = context.getType();
    
    if (contextType !== 'http') {
      // For non-HTTP contexts (WebSocket, GraphQL, etc.), just pass through
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Generate or get existing request ID
    const requestId =
      request.headers?.['x-request-id'] || this.logger.generateRequestId();

    // Set request ID in request object for use in services
    if (request) {
      request.requestId = requestId;
    }

    // Set response header for client (only if setHeader method exists)
    if (response && typeof response.setHeader === 'function') {
      try {
        response.setHeader('x-request-id', requestId);
      } catch (error) {
        // Silently ignore header setting errors for non-HTTP responses
        this.logger.debug('Could not set response header', { error: error.message });
      }
    }

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        // Log the request (with safe property access)
        this.logger.logRequest(
          request?.method || 'UNKNOWN',
          request?.url || 'UNKNOWN',
          response?.statusCode || 0,
          duration,
          {
            requestId,
            userId: request?.user?.id,
            userType: request?.user?.type,
          },
        );
      }),
    );
  }
}

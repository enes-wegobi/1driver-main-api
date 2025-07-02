import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TripEventsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit(event: string, payload: any): void {
    this.eventEmitter.emit(event, payload);
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }
}

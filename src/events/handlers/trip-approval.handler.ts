import { Injectable, OnModuleInit } from '@nestjs/common';
import { TripEventsService } from '../trip-events.service';
import { TripApprovedEvent } from '../types/trip-events.types';
import { DriverTripQueueService } from '../../redis/services/driver-trip-queue.service';
import { TripQueueService } from '../../queue/services/trip-queue.service';
import { LoggerService } from '../../logger/logger.service';
import { TripService } from '../../modules/trip/services/trip.service';

@Injectable()
export class TripApprovalHandler implements OnModuleInit {
  constructor(
    private readonly tripEventsService: TripEventsService,
    private readonly driverTripQueueService: DriverTripQueueService,
    private readonly tripQueueService: TripQueueService,
    private readonly tripService: TripService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    this.tripEventsService.on('trip.approved', this.handleTripApproved.bind(this));
  }

  private async handleTripApproved(event: TripApprovedEvent): Promise<void> {
    const { tripId, acceptingDriverId, calledDriverIds } = event;
    
    try {
      this.logger.info(`Background processing trip approval: ${tripId} by driver ${acceptingDriverId}`);
      
      // 1. Cleanup queues
      const affectedDrivers = await this.cleanupTripFromQueues(tripId, acceptingDriverId);
      
      // 2. Update rejected lists for other trips
      await this.updateOtherTripsRejectedLists(acceptingDriverId, tripId);
      
      // 3. Process next trips for affected drivers
      await this.processNextTripsForDrivers(affectedDrivers, acceptingDriverId);
      
      this.logger.info(`Trip approval background processing completed: ${tripId}`);
      
    } catch (error) {
      this.logger.error(`Trip approval background processing failed for ${tripId}: ${error.message}`);
    }
  }

  private async cleanupTripFromQueues(
    tripId: string, 
    acceptingDriverId: string
  ): Promise<string[]> {
    try {
      // Remove trip from all driver queues and get affected drivers
      const { affectedDrivers } = await this.driverTripQueueService
        .removeTripFromAllDriverQueuesWithAffectedDrivers(tripId);
      
      // Clear processing state for all affected drivers to prevent race conditions
      for (const driverId of affectedDrivers) {
        if (driverId !== acceptingDriverId) {
          await this.driverTripQueueService.clearDriverProcessingTrip(driverId);
        }
      }
      
      // Remove timeout jobs from Bull Queue
      await this.tripQueueService.removeJobsByTripId(tripId);
      
      this.logger.info(`Queue cleanup completed for trip ${tripId}, affected drivers: ${affectedDrivers.length}`);
      
      return affectedDrivers;
      
    } catch (error) {
      this.logger.error(`Queue cleanup failed for trip ${tripId}: ${error.message}`);
      return [];
    }
  }

  private async updateOtherTripsRejectedLists(
    acceptingDriverId: string, 
    acceptedTripId: string
  ): Promise<void> {
    try {
      // Get trips currently in driver queues (excluding the accepted trip)
      const driversWithTrips = await this.driverTripQueueService.getAllDriversWithAnyTrips();
      
      if (driversWithTrips.length === 0) {
        return;
      }

      // Limit to first 5 drivers for performance
      const limitedDrivers = driversWithTrips.slice(0, 5);
      
      for (const driverId of limitedDrivers) {
        if (driverId === acceptingDriverId) continue;
        
        try {
          const queueStatus = await this.driverTripQueueService.getDriverQueueStatus(driverId);
          
          // Process only first 2 trips in each driver's queue
          for (const queueItem of queueStatus.nextTrips.slice(0, 2)) {
            if (queueItem.tripId !== acceptedTripId) {
              await this.addDriverToTripRejectedList(acceptingDriverId, queueItem.tripId);
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to process driver ${driverId} queue: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.logger.error(`Failed to update rejected lists: ${error.message}`);
    }
  }

  private async addDriverToTripRejectedList(
    driverId: string, 
    tripId: string
  ): Promise<void> {
    try {
      // Get trip and add driver to rejected list
      const trip = await this.getTripById(tripId);
      
      if (!trip || trip.status !== 'WAITING_FOR_DRIVER') {
        return;
      }
      
      const rejectedDriverIds = [...(trip.rejectedDriverIds || [])];
      
      if (!rejectedDriverIds.includes(driverId)) {
        rejectedDriverIds.push(driverId);
        await this.updateTripRejectedDrivers(tripId, rejectedDriverIds);
        
        this.logger.info(`Added driver ${driverId} to rejected list of trip ${tripId}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to add driver ${driverId} to trip ${tripId} rejected list: ${error.message}`);
    }
  }

  private async getTripById(tripId: string): Promise<any> {
    return await this.tripService.findById(tripId);
  }

  private async updateTripRejectedDrivers(tripId: string, rejectedDriverIds: string[]): Promise<void> {
    await this.tripService.updateTripWithData(tripId, { rejectedDriverIds });
  }

  private async processNextTripsForDrivers(
    affectedDrivers: string[], 
    acceptingDriverId: string
  ): Promise<void> {
    const driversToProcess = affectedDrivers.filter(id => id !== acceptingDriverId);
    
    if (driversToProcess.length === 0) {
      return;
    }

    // Process max 3 drivers at a time to prevent overload
    const limit = Math.min(driversToProcess.length, 3);
    
    // Process drivers sequentially to avoid race conditions
    for (let i = 0; i < limit; i++) {
      const driverId = driversToProcess[i];
      
      try {
        // Process immediately since processing state is already cleared in cleanup
        await this.tripQueueService.processNextDriverRequest(driverId);
        this.logger.info(`Next trip processing started for driver ${driverId}`);
        
      } catch (error) {
        this.logger.warn(`Next trip processing failed for driver ${driverId}: ${error.message}`);
      }
    }
  }
}
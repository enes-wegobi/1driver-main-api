export interface TripApprovedEvent {
  tripId: string;
  acceptingDriverId: string;
  calledDriverIds: string[];
  customerId: string;
  timestamp: Date;
}

export interface TripRejectedEvent {
  tripId: string;
  rejectingDriverId: string;
  remainingDriverIds: string[];
  timestamp: Date;
}

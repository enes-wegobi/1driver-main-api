import { UserType } from 'src/common/user-type.enum';
import { EventType } from '../enum/event-type.enum';

export const customerFields = [
  'name',
  'surname',
  'rate',
  'vehicle.transmissionType',
  'vehicle.licensePlate',
  'photoKey',
];

export interface CustomerData {
  name?: string;
  surname?: string;
  rate?: number;
  vehicle?: {
    transmissionType?: string;
    licensePlate?: string;
  };
  photoKey?: string;
  photoUrl?: string;
}

export const driverFields = ['name', 'surname', 'rate', 'photoKey'];

export interface DriverData {
  name?: string;
  surname?: string;
  rate?: number;
  photoKey?: string;
  photoUrl?: string;
}

export enum EventDeliveryType {
  SINGLE = 'single',
  BROADCAST = 'broadcast',
}

export enum EventDeliveryMethod {
  WEBSOCKET = 'websocket',
  PUSH = 'push',
}

export interface EventConfig {
  targetUserType: UserType;
  deliveryType: EventDeliveryType;
}

export interface EnrichedEventData {
  [key: string]: any;
  driverDistanceInfo?: {
    distance?: number;
    duration?: number;
  };
  customer?: CustomerData;
  driver?: DriverData;
  driverLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number;
    userId?: string;
    userType?: string;
    updatedAt?: string;
  };
}

export const EVENT_CONFIG: Record<EventType, EventConfig> = {
  [EventType.TRIP_REQUESTED]: {
    targetUserType: UserType.DRIVER,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_DRIVER_ASSIGNED]: {
    targetUserType: UserType.CUSTOMER,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_ALREADY_TAKEN]: {
    targetUserType: UserType.DRIVER,
    deliveryType: EventDeliveryType.BROADCAST,
  },
  [EventType.TRIP_REJECTED]: {
    targetUserType: UserType.CUSTOMER,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_CANCELLED]: {
    targetUserType: UserType.BOTH,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_COMPLETED]: {
    targetUserType: UserType.BOTH,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_DRIVER_EN_ROUTE]: {
    targetUserType: UserType.CUSTOMER,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_DRIVER_ARRIVED]: {
    targetUserType: UserType.CUSTOMER,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_STARTED]: {
    targetUserType: UserType.CUSTOMER,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_DRIVER_NOT_FOUND]: {
    targetUserType: UserType.CUSTOMER,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_PAYMENT_REQUIRED]: {
    targetUserType: UserType.CUSTOMER,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_PAYMENT_STARTED]: {
    targetUserType: UserType.BOTH,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_PAYMENT_PROCESSING]: {
    targetUserType: UserType.BOTH,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_PAYMENT_SUCCESS]: {
    targetUserType: UserType.BOTH,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_PAYMENT_FAILED]: {
    targetUserType: UserType.BOTH,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.TRIP_PAYMENT_RETRY]: {
    targetUserType: UserType.BOTH,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.DRIVER_LOCATION_UPDATED]: {
    targetUserType: UserType.CUSTOMER,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.DRIVER_STATUS_CHANGED]: {
    targetUserType: UserType.CUSTOMER,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.CUSTOMER_LOCATION_UPDATED]: {
    targetUserType: UserType.DRIVER,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.NOTIFICATION]: {
    targetUserType: UserType.BOTH,
    deliveryType: EventDeliveryType.SINGLE,
  },
  [EventType.ERROR]: {
    targetUserType: UserType.BOTH,
    deliveryType: EventDeliveryType.SINGLE,
  },
};

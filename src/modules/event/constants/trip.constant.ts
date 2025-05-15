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

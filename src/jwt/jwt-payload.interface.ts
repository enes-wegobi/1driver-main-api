export enum UserType {
  DRIVER = 'driver',
  CUSTOMER = 'customer',
}

export interface IJwtPayload {
  userId: string;
  userType: UserType;
  email?: string;
}

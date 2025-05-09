import { UserType } from 'src/common/user-type.enum';

export interface IJwtPayload {
  userId: string;
  userType: UserType;
  email?: string;
}

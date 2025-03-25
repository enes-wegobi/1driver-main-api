export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

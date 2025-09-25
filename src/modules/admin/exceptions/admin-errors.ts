import { HttpStatus } from '@nestjs/common';

export interface AdminError {
  code: string;
  message: string;
  status: HttpStatus;
}

export const AdminErrors = {
  // Authentication Errors (A1XX)
  INVALID_CREDENTIALS: {
    code: 'A101',
    message: 'Email or password is incorrect',
    status: HttpStatus.UNAUTHORIZED,
  },
  ADMIN_NOT_FOUND: {
    code: 'A102',
    message: 'Admin not found',
    status: HttpStatus.NOT_FOUND,
  },
  INVALID_RESET_CODE: {
    code: 'A103',
    message: 'Invalid or expired verification code',
    status: HttpStatus.BAD_REQUEST,
  },
  PASSWORD_MISMATCH: {
    code: 'A104',
    message: 'Passwords do not match',
    status: HttpStatus.BAD_REQUEST,
  },
  RESET_CODE_NOT_FOUND: {
    code: 'A105',
    message: 'Admin with this email does not exist',
    status: HttpStatus.NOT_FOUND,
  },

  // Management Errors (A2XX)
  EMAIL_ALREADY_EXISTS: {
    code: 'A201',
    message: 'Admin with this email already exists',
    status: HttpStatus.CONFLICT,
  },
  CANNOT_DELETE_SUPER_ADMIN: {
    code: 'A202',
    message: 'Cannot delete super admin',
    status: HttpStatus.BAD_REQUEST,
  },
  INVALID_ADMIN_TYPE: {
    code: 'A203',
    message: 'Can only delete normal admin users',
    status: HttpStatus.BAD_REQUEST,
  },
  ADMIN_NOT_FOUND_FOR_DELETE: {
    code: 'A204',
    message: 'Admin not found',
    status: HttpStatus.NOT_FOUND,
  },

  // Validation Errors (A3XX)
  INVALID_INPUT_DATA: {
    code: 'A301',
    message: 'Invalid input data provided',
    status: HttpStatus.BAD_REQUEST,
  },
  INVALID_EMAIL_FORMAT: {
    code: 'A302',
    message: 'Invalid email format',
    status: HttpStatus.BAD_REQUEST,
  },
  WEAK_PASSWORD: {
    code: 'A303',
    message: 'Password does not meet security requirements',
    status: HttpStatus.BAD_REQUEST,
  },
} as const;
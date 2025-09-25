import { Injectable } from '@nestjs/common';
import { AdminException } from './admin.exception';
import { AdminErrors } from './admin-errors';

@Injectable()
export class AdminErrorService {
  static throwInvalidCredentials(): never {
    throw new AdminException(AdminErrors.INVALID_CREDENTIALS);
  }

  static throwAdminNotFound(): never {
    throw new AdminException(AdminErrors.ADMIN_NOT_FOUND);
  }

  static throwInvalidResetCode(): never {
    throw new AdminException(AdminErrors.INVALID_RESET_CODE);
  }

  static throwPasswordMismatch(): never {
    throw new AdminException(AdminErrors.PASSWORD_MISMATCH);
  }

  static throwResetCodeNotFound(): never {
    throw new AdminException(AdminErrors.RESET_CODE_NOT_FOUND);
  }

  static throwEmailAlreadyExists(): never {
    throw new AdminException(AdminErrors.EMAIL_ALREADY_EXISTS);
  }

  static throwCannotDeleteSuperAdmin(): never {
    throw new AdminException(AdminErrors.CANNOT_DELETE_SUPER_ADMIN);
  }

  static throwInvalidAdminType(): never {
    throw new AdminException(AdminErrors.INVALID_ADMIN_TYPE);
  }

  static throwAdminNotFoundForDelete(): never {
    throw new AdminException(AdminErrors.ADMIN_NOT_FOUND_FOR_DELETE);
  }

  static throwInvalidInputData(): never {
    throw new AdminException(AdminErrors.INVALID_INPUT_DATA);
  }

  static throwInvalidEmailFormat(): never {
    throw new AdminException(AdminErrors.INVALID_EMAIL_FORMAT);
  }

  static throwWeakPassword(): never {
    throw new AdminException(AdminErrors.WEAK_PASSWORD);
  }
}
import { HttpException } from '@nestjs/common';
import { AdminError } from './admin-errors';

export class AdminException extends HttpException {
  constructor(error: AdminError) {
    super({ code: error.code, message: error.message }, error.status);
  }
}

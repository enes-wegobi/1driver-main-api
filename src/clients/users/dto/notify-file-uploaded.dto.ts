import { FileType } from 'src/modules/drivers/enum/file-type.enum';

export class NotifyFileUploadedDto {
  userId: string;
  fileType: FileType;
  fileKey: string;
  contentType: string;
}

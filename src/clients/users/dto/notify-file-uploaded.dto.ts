import { S3FileType } from 'src/modules/drivers/enum/file-type.enum';

export class NotifyFileUploadedDto {
  userId: string;
  fileType: S3FileType;
  fileKey: string;
  fileUrl?: string;
}

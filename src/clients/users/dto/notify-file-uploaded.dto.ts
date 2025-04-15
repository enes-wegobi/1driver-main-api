import { S3FileType } from 'src/s3/s3-file-type.enum';

export class NotifyFileUploadedDto {
  userId: string;
  fileType: S3FileType;
  fileKey: string;
  fileUrl?: string;
}

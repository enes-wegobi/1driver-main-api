import { IsEnum, IsNotEmpty } from 'class-validator';
import { S3FileType } from '../s3-file-type.enum';

export class UploadFileDto {
  @IsEnum(S3FileType)
  @IsNotEmpty()
  fileType: S3FileType;
}

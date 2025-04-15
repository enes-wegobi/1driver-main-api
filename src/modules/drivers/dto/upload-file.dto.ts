import { IsEnum, IsNotEmpty } from 'class-validator';
import { FileType } from '../enum/file-type.enum';

export class UploadFileDto {
  @IsEnum(FileType)
  @IsNotEmpty()
  fileType: FileType;
}

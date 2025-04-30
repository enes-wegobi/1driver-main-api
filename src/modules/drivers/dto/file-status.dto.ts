import { ApiProperty } from '@nestjs/swagger';
import { FileType } from '../enum/file-type.enum';
import { DocumentStatus } from '../enum/document-status.enum';

export class FileStatusDto {
  @ApiProperty({ enum: FileType })
  fileType: FileType;

  @ApiProperty({ type: Boolean })
  isUploaded: boolean;

  @ApiProperty({ enum: DocumentStatus, nullable: true })
  status: DocumentStatus | null;

  @ApiProperty({ type: Date, nullable: true })
  uploadedAt: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  verifiedAt: Date | null;

  @ApiProperty({ type: String, nullable: true })
  fileKey: string | null;
}

export class DriverFilesStatusDto {
  @ApiProperty({ type: [FileStatusDto] })
  files: FileStatusDto[];

  @ApiProperty({
    type: Boolean,
    description:
      'Whether the driver can use the app based on document verification status',
  })
  canUseApp: boolean;
}

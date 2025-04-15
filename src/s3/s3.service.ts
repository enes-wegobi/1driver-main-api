import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.awsRegion;
    this.bucketName = this.configService.awsS3BucketName;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.awsAccessKeyId,
        secretAccessKey: this.configService.awsSecretAccessKey,
      },
    });
  }

  /**
   * Uploads a file to S3 with an automatically generated key.
   * @param file The file to upload.
   * @returns The generated file key.
   */
  async uploadFileWithGeneratedKey(file: Express.Multer.File): Promise<string> {
    const fileKey = `${uuidv4()}-${file.originalname}`;
    await this.uploadFileWithKey(file, fileKey);
    return fileKey;
  }

  /**
   * Uploads a file to S3 with a specific key.
   * @param file The file to upload.
   * @param fileKey The specific key to use for the S3 object.
   */
  async uploadFileWithKey(file: Express.Multer.File, fileKey: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);
  }

  async getSignedUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    await this.s3Client.send(command);
  }

}

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.spacesRegion;
    this.bucketName = this.configService.spacesBucketName;

    this.logger.log(
      `Initializing S3 client with region: ${this.region}, bucket: ${this.bucketName}`,
    );

    // Digital Ocean Spaces için S3Client konfigürasyonu
    this.s3Client = new S3Client({
      region: this.region,
      endpoint: this.configService.spacesEndpoint,
      forcePathStyle: false,
      credentials: {
        accessKeyId: this.configService.spacesAccessKeyId,
        secretAccessKey: this.configService.spacesSecretAccessKey,
      },
    });

    this.logger.log(
      `S3 client initialized with endpoint: ${this.configService.spacesEndpoint}`,
    );
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
  async uploadFileWithKey(
    file: Express.Multer.File,
    fileKey: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Uploading file with key: ${fileKey} to bucket: ${this.bucketName}`,
      );

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Digital Ocean Spaces için gerekli
      });

      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully with key: ${fileKey}`);
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSignedUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      this.logger.log(`Getting signed URL for file with key: ${fileKey}`);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      this.logger.log(`Signed URL generated successfully for key: ${fileKey}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Error getting signed URL: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    try {
      this.logger.log(
        `Deleting file with key: ${fileKey} from bucket: ${this.bucketName}`,
      );

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully with key: ${fileKey}`);
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`, error.stack);
      throw error;
    }
  }
}

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import { LoggerService } from 'src/logger/logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.region = this.configService.spacesRegion;
    this.bucketName = this.configService.spacesBucketName;

    this.logger.info(
      `Initializing S3 client with region: ${this.region}, bucket: ${this.bucketName}`,
    );

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: this.configService.spacesEndpoint,
      forcePathStyle: false,
      credentials: {
        accessKeyId: this.configService.spacesAccessKeyId,
        secretAccessKey: this.configService.spacesSecretAccessKey,
      },
    });

    this.logger.info(
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
      this.logger.info(
        `Uploading file with key: ${fileKey} to bucket: ${this.bucketName}`,
      );

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);
      this.logger.info(`File uploaded successfully with key: ${fileKey}`);
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
      this.logger.info(`Getting signed URL for file with key: ${fileKey}`);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      this.logger.info(`Signed URL generated successfully for key: ${fileKey}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Error getting signed URL: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generates a permanent public URL for a file in S3.
   * @param fileKey The key of the file in S3.
   * @returns The permanent public URL.
   */
  getPublicUrl(fileKey: string): string {
    this.logger.info(`Generating public URL for file with key: ${fileKey}`);
    const endpoint = this.configService.spacesCdnEndpoint;
    const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');

    return `https://${cleanEndpoint}/${fileKey}`;
  }

  async deleteFile(fileKey: string): Promise<void> {
    try {
      this.logger.info(
        `Deleting file with key: ${fileKey} from bucket: ${this.bucketName}`,
      );

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      this.logger.info(`File deleted successfully with key: ${fileKey}`);
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`, error.stack);
      throw error;
    }
  }
}

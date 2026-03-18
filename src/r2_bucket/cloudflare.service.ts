import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

export interface UploadResult {
  key: string;
  url: string;
}

export interface UploadMultipleResult {
  keys: string[];
  urls: string[];
}

@Injectable()
export class CloudflareService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.getOrThrow<string>('R2_ACCOUNT_ID');
    const accessKeyId =
      this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.getOrThrow<string>(
      'R2_SECRET_ACCESS_KEY',
    );
    this.bucketName = this.configService.getOrThrow<string>('R2_BUCKET_NAME');
    this.publicUrl = this.configService.getOrThrow<string>('R2_PUBLIC_URL');

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId ?? '',
        secretAccessKey: secretAccessKey ?? '',
      },
    });
  }

  private generateKey(originalName: string, folder?: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/\s+/g, '-');

    const key = folder
      ? `${folder}/${timestamp}-${randomSuffix}-${baseName}.${extension}`
      : `${timestamp}-${randomSuffix}-${baseName}.${extension}`;

    return key;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadResult> {
    const key = this.generateKey(file.originalname, folder);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);

    const url = `${this.publicUrl}/${key}`;

    return { key, url };
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder?: string,
  ): Promise<UploadMultipleResult> {
    const keys: string[] = [];
    const urls: string[] = [];

    for (const file of files) {
      const result = await this.uploadFile(file, folder);
      keys.push(result.key);
      urls.push(result.url);
    }

    return { keys, urls };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  getKeyFromUrl(url: string): string {
    return url.replace(`${this.publicUrl}/`, '');
  }
}

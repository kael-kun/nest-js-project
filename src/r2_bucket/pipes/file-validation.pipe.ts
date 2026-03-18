import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { IsOptional } from 'class-validator';

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FileValidationPipe implements PipeTransform<MulterFile> {
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];

  private readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB

  transform(file: MulterFile): MulterFile | undefined {
    if (!file) {
      return undefined;
    }
    if (file.size > this.MAX_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of 5MB`,
      );
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    return file;
  }
}

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class FormDataTransformPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!value || metadata.type !== 'body') {
      return value;
    }

    const jsonFields = ['roles'];

    for (const field of jsonFields) {
      if (value[field] && typeof value[field] === 'string') {
        try {
          value[field] = JSON.parse(value[field]);
        } catch {
          throw new BadRequestException(`${field} must be a valid JSON array`);
        }
      }
    }

    return value;
  }
}

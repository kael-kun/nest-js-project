import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class EmptyStringToUndefinedPipe implements PipeTransform {
  transform(value: any): any {
    if (value === '') {
      return undefined;
    }
    return value;
  }
}

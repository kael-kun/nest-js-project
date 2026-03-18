import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class NullFilterInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.removeNull(data)));
  }

  private removeNull(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeNull(item));
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== null && v !== undefined)
          .map(([k, v]) => [k, this.removeNull(v)]),
      );
    }
    return obj;
  }
}

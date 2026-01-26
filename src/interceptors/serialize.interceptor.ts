import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getSerializeType } from '@decorators/serialize.decorator';

import { plainToInstance } from 'class-transformer';

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((value) => {
        if (typeof value !== 'object' || value === null) {
          return value;
        }

        const SerializeType = getSerializeType(context.getHandler());
        const serializer = (data: any) =>
          plainToInstance(SerializeType, data, {
            excludeExtraneousValues: true,
          });

        function serialize(data: any) {
          return serializer(data);
        }

        if (value.meta) {
          return {
            ...value,
            data: serialize(value.data),
          };
        }

        return serialize(value);
      }),
    );
  }
}

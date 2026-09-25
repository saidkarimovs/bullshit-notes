import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { ApiSuccess, PaginationMeta } from "@bn/shared";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

interface ListShape {
  items: unknown;
  meta: PaginationMeta;
}

function isListShape(v: unknown): v is ListShape {
  return (
    typeof v === "object" &&
    v !== null &&
    "items" in v &&
    "meta" in v &&
    (v as Record<string, unknown>).meta !== null &&
    typeof (v as Record<string, unknown>).meta === "object"
  );
}

// Wraps controller return values in the success envelope.
// { items, meta } => { data: items, meta }; everything else => { data: value }.
@Injectable()
export class TransformInterceptor
  implements NestInterceptor<unknown, ApiSuccess<unknown>>
{
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccess<unknown>> {
    return next.handle().pipe(
      map((value): ApiSuccess<unknown> => {
        if (isListShape(value)) {
          return { data: value.items, meta: value.meta };
        }
        return { data: value };
      }),
    );
  }
}

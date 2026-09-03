import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/** Header do Spring Cloud Gateway chèn sau khi đã xác thực JWT. */
export const USER_ID_HEADER = 'x-user-id';
export const USER_ROLE_HEADER = 'x-user-role';
export const USER_EMAIL_HEADER = 'x-user-email';

/**
 * Đọc danh tính người dùng từ header mà API Gateway chèn vào.
 *
 * Gateway đã kiểm JWT trong `JwtAuthenticationFilter` rồi mới chuyển tiếp, nên
 * service này không kiểm chữ ký lại. Việc cần làm là đưa danh tính vào
 * `request.userId` để decorator `@UserId()` của common-node đọc được — decorator
 * đó tìm ở `request.userId` chứ không đọc header.
 *
 * Lưu ý bảo mật: cách này chỉ an toàn khi service KHÔNG phơi ra ngoài internet.
 * Gọi thẳng cổng 9100 mà tự đặt header `X-User-Id` là mạo danh được bất kỳ ai.
 * Trong K8s phải chặn bằng NetworkPolicy, chỉ cho gateway gọi tới.
 */
@Injectable()
export class GatewayUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.headers[USER_ID_HEADER];

    if (typeof userId !== 'string' || userId.trim() === '') {
      throw new UnauthorizedException(
        'Thiếu header X-User-Id. Hãy gọi qua API Gateway thay vì gọi thẳng service.',
      );
    }

    const mutable = request as Request & {
      userId?: string;
      userRole?: string;
      userEmail?: string;
    };
    mutable.userId = userId.trim();

    const role = request.headers[USER_ROLE_HEADER];
    mutable.userRole = typeof role === 'string' ? role : undefined;

    const email = request.headers[USER_EMAIL_HEADER];
    mutable.userEmail = typeof email === 'string' ? email : undefined;

    return true;
  }
}

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GatewayUserGuard } from './gateway-user.guard';

const USER_ID = 'a07912c8-4003-4087-a373-5fe65f4f59a6';

type MutableRequest = {
  headers: Record<string, string | string[] | undefined>;
  userId?: string;
  userRole?: string;
  userEmail?: string;
};

const contextFor = (request: MutableRequest): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('GatewayUserGuard', () => {
  const guard = new GatewayUserGuard();

  it('should copy the gateway header onto request.userId', () => {
    // Decorator @UserId() của common-node đọc request.userId, không đọc header.
    // Không bắc cầu ở đây thì controller nhận undefined.
    const request: MutableRequest = { headers: { 'x-user-id': USER_ID } };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(request.userId).toBe(USER_ID);
  });

  it('should carry role and email through when present', () => {
    const request: MutableRequest = {
      headers: {
        'x-user-id': USER_ID,
        'x-user-role': 'student',
        'x-user-email': 'hocvien@ioes.test',
      },
    };

    guard.canActivate(contextFor(request));

    expect(request.userRole).toBe('student');
    expect(request.userEmail).toBe('hocvien@ioes.test');
  });

  it('should allow a request with no role header', () => {
    const request: MutableRequest = { headers: { 'x-user-id': USER_ID } };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(request.userRole).toBeUndefined();
  });

  it('should reject a request with no user header', () => {
    // Nghĩa là ai đó gọi thẳng cổng 9100, bỏ qua gateway.
    expect(() => guard.canActivate(contextFor({ headers: {} }))).toThrow(
      UnauthorizedException,
    );
  });

  it('should reject a blank user header', () => {
    expect(() =>
      guard.canActivate(contextFor({ headers: { 'x-user-id': '   ' } })),
    ).toThrow(UnauthorizedException);
  });

  it('should reject a duplicated header sent as an array', () => {
    // Gửi hai lần cùng một header thì Express gộp thành mảng. Nhận bừa sẽ mở
    // đường cho tấn công nhập nhằng header.
    const request: MutableRequest = {
      headers: { 'x-user-id': [USER_ID, 'ke-mao-danh'] },
    };

    expect(() => guard.canActivate(contextFor(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('should trim surrounding whitespace', () => {
    const request: MutableRequest = {
      headers: { 'x-user-id': `  ${USER_ID}  ` },
    };

    guard.canActivate(contextFor(request));

    expect(request.userId).toBe(USER_ID);
  });
});

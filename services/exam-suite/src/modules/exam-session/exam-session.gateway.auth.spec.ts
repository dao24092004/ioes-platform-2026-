import * as jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { ExamSessionGateway } from './exam-session.gateway';
import { jwtConfig } from '../../config/app.config';

const USER_UUID = '00000000-0000-4000-8000-000000000001';

/**
 * WebSocket handshake phải verify chữ ký + exp + iss của JWT, không chỉ decode payload.
 */
describe('ExamSessionGateway - handshake JWT verification', () => {
  let gateway: ExamSessionGateway;
  const secret = jwtConfig.secret;
  const now = () => Math.floor(Date.now() / 1000);

  const sign = (
    claims: Record<string, unknown> = {},
    opts: jwt.SignOptions = {},
    key: string = secret,
  ): string =>
    jwt.sign(
      { sub: USER_UUID, role: 'student', email: 's@x.io', type: 'access', ...claims },
      key,
      { algorithm: 'HS384', issuer: jwtConfig.issuer, expiresIn: '5m', ...opts },
    );

  const makeSocket = (handshake: {
    auth?: Record<string, unknown>;
    query?: Record<string, unknown>;
    headers?: Record<string, unknown>;
  }): Socket =>
    ({
      id: 'sock-1',
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
      handshake: { auth: {}, query: {}, headers: {}, ...handshake },
    }) as unknown as Socket;

  const expectRejected = (socket: Socket) => {
    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socket.emit).toHaveBeenCalledWith(
      'exam:error',
      expect.objectContaining({ code: 'UNAUTHORIZED' }),
    );
    expect((socket.data as any).userId).toBeUndefined();
  };

  beforeEach(() => {
    gateway = new ExamSessionGateway({} as any, {} as any, {} as any, {} as any);
  });

  it('should_attachUser_When_validHs384AccessToken', async () => {
    const socket = makeSocket({ auth: { token: sign() } });
    await gateway.handleConnection(socket);
    expect(socket.disconnect).not.toHaveBeenCalled();
    expect((socket.data as any).userId).toBe(USER_UUID);
    expect((socket.data as any).role).toBe('STUDENT');
  });

  it('should_acceptBearerHeader_When_noAuthPayload', async () => {
    const socket = makeSocket({ headers: { authorization: `Bearer ${sign()}` } });
    await gateway.handleConnection(socket);
    expect((socket.data as any).userId).toBe(USER_UUID);
  });

  it('should_reject_When_tokenMissing', async () => {
    const socket = makeSocket({});
    await gateway.handleConnection(socket);
    expectRejected(socket);
  });

  it('should_reject_When_signedWithOtherSecret', async () => {
    const socket = makeSocket({
      auth: { token: sign({}, {}, 'another-secret-that-is-at-least-32-characters-long!!') },
    });
    await gateway.handleConnection(socket);
    expectRejected(socket);
  });

  it('should_reject_When_payloadTamperedButSignatureKept', async () => {
    const [h, , s] = sign().split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'attacker', role: 'admin', type: 'access', iss: jwtConfig.issuer, exp: now() + 300 }),
    ).toString('base64url');
    const socket = makeSocket({ auth: { token: `${h}.${forged}.${s}` } });
    await gateway.handleConnection(socket);
    expectRejected(socket);
  });

  it('should_reject_When_algNone', async () => {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
      sub: USER_UUID,
      role: 'student',
      type: 'access',
      iss: jwtConfig.issuer,
      exp: now() + 300,
    })}.`;
    const socket = makeSocket({ auth: { token } });
    await gateway.handleConnection(socket);
    expectRejected(socket);
  });

  it('should_reject_When_expired', async () => {
    const token = jwt.sign(
      { sub: USER_UUID, role: 'student', type: 'access', exp: now() - 60 },
      secret,
      { algorithm: 'HS384', issuer: jwtConfig.issuer },
    );
    const socket = makeSocket({ auth: { token } });
    await gateway.handleConnection(socket);
    expectRejected(socket);
  });

  it('should_reject_When_wrongIssuer', async () => {
    const socket = makeSocket({ auth: { token: sign({}, { issuer: 'someone-else' }) } });
    await gateway.handleConnection(socket);
    expectRejected(socket);
  });

  it('should_reject_When_refreshToken', async () => {
    const socket = makeSocket({ query: { token: sign({ type: 'refresh' }) } });
    await gateway.handleConnection(socket);
    expectRejected(socket);
  });
});

export interface JwtPayload {
  sub: string;        // userId
  email: string;
  role: string;
  name?: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

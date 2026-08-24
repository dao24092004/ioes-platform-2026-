import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { StructuredLogger } from '../logger/structured-logger';
import { JwtPayload } from '../types/jwt-payload.type';
import { ServiceClient } from './service-client.base';

/**
 * AuthClient - giao tiếp với auth-service qua Gateway.
 *
 * Theo ADR-006:
 * - Verify token qua auth-service (RS256 public key)
 * - Cache JWKS public key (TTL 1h)
 * - Cache user info (TTL 5min)
 *
 * KHÔNG dùng local JWT secret (đã fix BUG #105).
 */
@Injectable()
export class AuthClient extends ServiceClient {
  private readonly logger = new StructuredLogger(AuthClient.name);
  private jwksCache: { keys: JwkKey[]; fetchedAt: number } | null = null;
  private readonly JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour
  private userCache = new Map<string, { payload: JwtPayload; cachedAt: number }>();
  private readonly USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(http: HttpService) {
    super(
      http,
      'auth',
      process.env.API_GATEWAY_URL ?? 'http://localhost:8080',
    );
  }

  /**
   * Verify JWT token qua auth-service.
   * Returns decoded payload nếu valid, throw 401 nếu invalid.
   *
   * Flow:
   * 1. Check user cache (5min TTL)
   * 2. Nếu miss → call /auth/verify token
   * 3. Cache result
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    if (!token || typeof token !== 'string') {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }

    // Cache hit?
    const cached = this.userCache.get(token);
    if (cached && Date.now() - cached.cachedAt < this.USER_CACHE_TTL_MS) {
      return cached.payload;
    }

    try {
      const response = await firstValueFrom(
        this.http.request<{ valid: boolean; payload?: JwtPayload; error?: string }>({
          method: 'POST',
          url: `${this.baseUrl}/api/auth/verify`,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: this.timeoutMs,
        }),
      );

      if (!response.data?.valid || !response.data.payload) {
        this.logger.warn(`Token verification failed: ${response.data?.error}`);
        throw new HttpException(
          response.data?.error ?? 'Invalid token',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const payload = response.data.payload;
      this.userCache.set(token, { payload, cachedAt: Date.now() });
      return payload;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Token verification error: ${(err as Error).message}`);
      throw new HttpException('Token verification failed', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * Lấy thông tin user từ auth-service.
   */
  async getUserById(userId: string): Promise<JwtPayload | null> {
    try {
      const response = await firstValueFrom(
        this.http.request<JwtPayload>({
          method: 'GET',
          url: `${this.baseUrl}/api/auth/users/${userId}`,
          timeout: this.timeoutMs,
        }),
      );
      return response.data;
    } catch (err) {
      this.logger.warn(`Get user ${userId} failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Fetch JWKS từ auth-service (cached).
   * Public keys dùng để verify RS256 token offline (nếu auth-service down).
   */
  async getJwks(): Promise<JwkKey[]> {
    if (this.jwksCache && Date.now() - this.jwksCache.fetchedAt < this.JWKS_TTL_MS) {
      return this.jwksCache.keys;
    }

    try {
      const response = await firstValueFrom(
        this.http.request<{ keys: JwkKey[] }>({
          method: 'GET',
          url: `${this.baseUrl}/api/auth/.well-known/jwks.json`,
          timeout: this.timeoutMs,
        }),
      );

      this.jwksCache = {
        keys: response.data.keys,
        fetchedAt: Date.now(),
      };
      this.logger.debug(`JWKS cached: ${response.data.keys.length} keys`);
      return this.jwksCache.keys;
    } catch (err) {
      this.logger.error(`JWKS fetch failed: ${(err as Error).message}`);
      // Return cached nếu có (graceful degradation)
      return this.jwksCache?.keys ?? [];
    }
  }

  /**
   * Invalidate token cache (vd: khi logout).
   */
  invalidateToken(token: string): void {
    this.userCache.delete(token);
  }

  /**
   * Invalidate user cache khi user info thay đổi.
   */
  invalidateUser(userId: string): void {
    for (const [token, entry] of this.userCache.entries()) {
      if (entry.payload.sub === userId) {
        this.userCache.delete(token);
      }
    }
  }
}

interface JwkKey {
  kty: string;
  kid: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

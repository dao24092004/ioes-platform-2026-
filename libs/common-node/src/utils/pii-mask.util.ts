/**
 * PII Masking utility cho error responses.
 *
 * BUG #100 fix: thông tin nhạy cảm (email, phone, JWT, card) không được
 * leak ra response body hoặc log lines.
 *
 * Use cases:
 * - Mask error message trước khi trả về cho client
 * - Mask log output
 * - Mask audit log fields
 */

const MASK = '***';

/**
 * Mask email → a***@domain.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 3) {
    return `${MASK}@${domain}`;
  }
  return `${local.slice(0, 3)}${MASK}@${domain}`;
}

/**
 * Mask phone number → +1***xxx (giữ country code + last 3 digits).
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 5) return MASK;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 5) return MASK;
  return `${cleaned.slice(0, 1)}${MASK}${cleaned.slice(-3)}`;
}

/**
 * Mask JWT token → [REDACTED-JWT]
 */
export function maskJwt(token: string): string {
  if (!token) return token;
  return '[REDACTED-JWT]';
}

/**
 * Mask credit card → [REDACTED-CC] (giữ last 4 digits cho debug).
 */
export function maskCreditCard(card: string): string {
  if (!card) return card;
  const cleaned = card.replace(/\D/g, '');
  if (cleaned.length < 4) return MASK;
  return `[REDACTED-CC-XXXX${cleaned.slice(-4)}]`;
}

/**
 * Mask bearer token → Bearer [REDACTED]
 */
export function maskBearer(authHeader: string): string {
  if (!authHeader) return authHeader;
  return authHeader.replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]');
}

/**
 * Auto-detect và mask PII từ 1 string.
 */
export function maskPIIInString(input: string): string {
  if (!input) return input;
  let masked = input;

  // Email
  masked = masked.replace(
    /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (match, local, domain) => maskEmail(match),
  );

  // Credit card PHAI chay truoc phone: regex phone khop duoc mot phan
  // day so the va lam bien dang no, khien regex the khong con nhan ra.
  masked = masked.replace(
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    (match) => maskCreditCard(match),
  );

  // JWT
  masked = masked.replace(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    '[REDACTED-JWT]',
  );

  // Phone (basic patterns)
  masked = masked.replace(
    /(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g,
    (match) => maskPhone(match),
  );

  // Bearer
  masked = masked.replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]');

  return masked;
}

/**
 * Recursively mask PII từ 1 object/string/array.
 */
export function maskPIIInValue<T>(value: T, maxDepth = 5): T {
  if (maxDepth <= 0) return value;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return maskPIIInString(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => maskPIIInValue(v, maxDepth - 1)) as unknown as T;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const masked: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const lowerKey = k.toLowerCase();
      // Bi mat thuan khong co dang de nhan ra, maskPIIInString tra ve nguyen
      // van. Nhung truong nay phai xoa han thay vi che theo mau.
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('credential')
      ) {
        masked[k] = '[REDACTED]';
      } else if (
        lowerKey.includes('email') ||
        lowerKey.includes('phone') ||
        lowerKey.includes('token')
      ) {
        masked[k] = typeof v === 'string' ? maskPIIInString(v) : '[REDACTED]';
      } else {
        masked[k] = maskPIIInValue(v, maxDepth - 1);
      }
    }
    return masked as unknown as T;
  }
  return value;
}

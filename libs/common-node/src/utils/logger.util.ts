import { Logger } from '@nestjs/common';

/**
 * Service-scoped logger factory.
 * Usage: private readonly logger = createLogger('AuthService');
 */
export const createLogger = (context: string): Logger => new Logger(context);

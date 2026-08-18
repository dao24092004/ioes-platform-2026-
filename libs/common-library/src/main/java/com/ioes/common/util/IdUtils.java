package com.ioes.common.util;

import java.security.SecureRandom;
import java.util.UUID;

/**
 * ID generation utility. Wraps UUID v4 by default - replace with UUID v7
 * once the jdk adds first-class support or the uuid-creator library is
 * added to the project.
 */
public final class IdUtils {

    private IdUtils() {}

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Generate a new UUID v4.
     */
    public static String uuid() {
        return UUID.randomUUID().toString();
    }

    /**
     * Generate a short id (last 12 chars of a UUID) - useful for log lines.
     */
    public static String shortId() {
        return UUID.randomUUID().toString().substring(24);
    }

    /**
     * Generate a numeric OTP with the given number of digits.
     */
    public static String otp(int digits) {
        if (digits <= 0) {
            throw new IllegalArgumentException("digits must be > 0");
        }
        int max = (int) Math.pow(10, digits);
        int min = (int) Math.pow(10, digits - 1);
        return String.valueOf(min + RANDOM.nextInt(max - min));
    }

    /**
     * Generate a random alphanumeric token. Used for password-reset tokens,
     * email-verify tokens, etc.
     */
    public static String randomToken(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(RANDOM.nextInt(chars.length())));
        }
        return sb.toString();
    }
}

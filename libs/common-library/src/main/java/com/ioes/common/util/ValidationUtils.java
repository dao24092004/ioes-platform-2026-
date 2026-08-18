package com.ioes.common.util;

import com.ioes.common.exception.ApiException;

import java.util.regex.Pattern;

/**
 * Common format validators. Use as a final guard before persisting
 * (DTO-level Bean Validation should run first).
 */
public final class ValidationUtils {

    private ValidationUtils() {}

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private static final Pattern UUID_PATTERN = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "^\\+?[0-9]{8,15}$");

    private static final Pattern SLUG_PATTERN = Pattern.compile(
            "^[a-z0-9]+(?:-[a-z0-9]+)*$");

    public static boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    public static boolean isValidUuid(String value) {
        return value != null && UUID_PATTERN.matcher(value).matches();
    }

    public static boolean isValidPhone(String phone) {
        return phone != null && PHONE_PATTERN.matcher(phone).matches();
    }

    public static boolean isValidSlug(String slug) {
        return slug != null && SLUG_PATTERN.matcher(slug).matches();
    }

    public static void requireEmail(String email) {
        if (!isValidEmail(email)) {
            throw ApiException.badRequest("Invalid email: " + email);
        }
    }

    public static void requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest(fieldName + " must not be blank");
        }
    }

    public static void requirePositive(Number value, String fieldName) {
        if (value == null || value.doubleValue() <= 0) {
            throw ApiException.badRequest(fieldName + " must be positive");
        }
    }
}

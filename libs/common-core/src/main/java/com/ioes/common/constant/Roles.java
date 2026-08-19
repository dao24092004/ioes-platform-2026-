package com.ioes.common.constant;

/**
 * User role names. Stored as strings in JWT claims and DB.
 */
public final class Roles {

    private Roles() {}

    public static final String STUDENT = "STUDENT";
    public static final String INSTRUCTOR = "INSTRUCTOR";
    public static final String ADMIN = "ADMIN";
    public static final String SYSTEM = "SYSTEM";

    public static boolean isValid(String role) {
        return STUDENT.equals(role)
                || INSTRUCTOR.equals(role)
                || ADMIN.equals(role)
                || SYSTEM.equals(role);
    }
}
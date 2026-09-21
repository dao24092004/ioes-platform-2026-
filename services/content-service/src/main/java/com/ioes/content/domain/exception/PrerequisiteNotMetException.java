package com.ioes.content.domain.exception;

/** Ném khi user chưa hoàn thành khoá tiên quyết trước khi ghi danh. */
public class PrerequisiteNotMetException extends RuntimeException {

    public PrerequisiteNotMetException(String message) {
        super(message);
    }
}

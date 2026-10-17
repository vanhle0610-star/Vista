package com.vista.common.web;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.Map;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ProblemDetail validation(MethodArgumentNotValidException exception, HttpServletRequest request) {
    var problem =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST, "Một hoặc nhiều trường không hợp lệ");
    problem.setType(URI.create("https://vista.example/errors/validation"));
    problem.setTitle("Validation failed");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "VALIDATION_ERROR");
    problem.setProperty("requestId", MDC.get("requestId"));
    problem.setProperty(
        "errors",
        exception.getBindingResult().getFieldErrors().stream()
            .map(
                e ->
                    Map.of(
                        "field",
                        e.getField(),
                        "message",
                        e.getDefaultMessage() == null ? "invalid" : e.getDefaultMessage()))
            .toList());
    return problem;
  }

  @ExceptionHandler(Exception.class)
  ProblemDetail unexpected(Exception exception, HttpServletRequest request) {
    var problem =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi không mong đợi");
    problem.setType(URI.create("https://vista.example/errors/internal"));
    problem.setTitle("Internal server error");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "INTERNAL_ERROR");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }
}

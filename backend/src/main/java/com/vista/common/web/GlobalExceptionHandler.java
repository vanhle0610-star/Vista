package com.vista.common.web;

import com.vista.auth.exception.EmailAlreadyExistsException;
import com.vista.auth.exception.InvalidPasswordException;
import com.vista.auth.exception.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalExceptionHandler {
  @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
  ProblemDetail uploadTooLarge(HttpServletRequest request) {
    var problem =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.PAYLOAD_TOO_LARGE,
            "File vượt giới hạn tải lên. Ảnh cộng đồng tối đa 5 MiB mỗi ảnh.");
    problem.setProperty("code", "IMAGE_TOO_LARGE");
    problem.setProperty("requestId", MDC.get("requestId"));
    problem.setInstance(URI.create(request.getRequestURI()));
    return problem;
  }

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

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

  @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
  ProblemDetail malformedJson(
      org.springframework.http.converter.HttpMessageNotReadableException exception,
      HttpServletRequest request) {
    var problem =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            "Định dạng dữ liệu yêu cầu không hợp lệ (JSON không đúng chuẩn)");
    problem.setType(URI.create("https://vista.example/errors/validation"));
    problem.setTitle("Malformed JSON Request");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "MALFORMED_JSON");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(InvalidPasswordException.class)
  ProblemDetail invalidPassword(InvalidPasswordException exception, HttpServletRequest request) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    problem.setType(URI.create("https://vista.example/errors/validation"));
    problem.setTitle("Validation failed");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "VALIDATION_ERROR");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(com.vista.trip.exception.InvalidTripDateException.class)
  ProblemDetail invalidTripDate(
      com.vista.trip.exception.InvalidTripDateException exception, HttpServletRequest request) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    problem.setType(URI.create("https://vista.example/errors/validation"));
    problem.setTitle("Validation failed");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "VALIDATION_ERROR");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(IllegalArgumentException.class)
  ProblemDetail illegalArgument(IllegalArgumentException exception, HttpServletRequest request) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    problem.setType(URI.create("https://vista.example/errors/validation"));
    problem.setTitle("Validation failed");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "VALIDATION_ERROR");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(EmailAlreadyExistsException.class)
  ProblemDetail emailAlreadyExists(
      EmailAlreadyExistsException exception, HttpServletRequest request) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
    problem.setType(URI.create("https://vista.example/errors/conflict"));
    problem.setTitle("Email already exists");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "DUPLICATE_EMAIL");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ProblemDetail dataIntegrityViolation(
      DataIntegrityViolationException exception, HttpServletRequest request) {
    var problem =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.CONFLICT,
            "Dữ liệu bị trùng lặp hoặc vi phạm ràng buộc toàn vẹn cơ sở dữ liệu");
    problem.setType(URI.create("https://vista.example/errors/conflict"));
    problem.setTitle("Conflict");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "DUPLICATE_EMAIL");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(RateLimitExceededException.class)
  ResponseEntity<ProblemDetail> rateLimitExceeded(
      RateLimitExceededException exception, HttpServletRequest request) {
    var problem =
        ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, exception.getMessage());
    problem.setType(URI.create("https://vista.example/errors/too-many-requests"));
    problem.setTitle("Too Many Requests");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "RATE_LIMIT_EXCEEDED");
    problem.setProperty("retryAfterSeconds", exception.getRetryAfterSeconds());
    problem.setProperty("requestId", MDC.get("requestId"));

    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
        .header(HttpHeaders.RETRY_AFTER, String.valueOf(exception.getRetryAfterSeconds()))
        .body(problem);
  }

  @ExceptionHandler(BadCredentialsException.class)
  ProblemDetail badCredentials(BadCredentialsException exception, HttpServletRequest request) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, exception.getMessage());
    problem.setType(URI.create("https://vista.example/errors/unauthorized"));
    problem.setTitle("Unauthorized");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "INVALID_CREDENTIALS");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
  ProblemDetail credentialsNotFound(
      AuthenticationCredentialsNotFoundException exception, HttpServletRequest request) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, exception.getMessage());
    problem.setType(URI.create("https://vista.example/errors/unauthorized"));
    problem.setTitle("Unauthorized");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "UNAUTHORIZED");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(com.vista.trip.ForbiddenException.class)
  ProblemDetail forbidden(com.vista.trip.ForbiddenException exception, HttpServletRequest request) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, exception.getMessage());
    problem.setType(URI.create("https://vista.example/errors/forbidden"));
    problem.setTitle("Forbidden");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "FORBIDDEN");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(com.vista.collaboration.exception.ConflictException.class)
  ProblemDetail conflict(
      com.vista.collaboration.exception.ConflictException exception, HttpServletRequest request) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
    problem.setType(URI.create("https://vista.example/errors/conflict"));
    problem.setTitle("Conflict");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "CONFLICT");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  /** W4-TV3-01: Xung đột optimistic locking từ JPA @Version → 409 */
  @ExceptionHandler({
    ObjectOptimisticLockingFailureException.class,
    OptimisticLockingFailureException.class
  })
  ProblemDetail optimisticLockConflict(Exception exception, HttpServletRequest request) {
    var problem =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.CONFLICT,
            "Dữ liệu đã bị cập nhật bởi người dùng khác — vui lòng tải lại và thử lại");
    problem.setType(URI.create("https://vista.example/errors/conflict"));
    problem.setTitle("Optimistic Lock Conflict");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "VERSION_CONFLICT");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(com.vista.collaboration.exception.ResourceNotFoundException.class)
  ProblemDetail notFound(
      com.vista.collaboration.exception.ResourceNotFoundException exception,
      HttpServletRequest request) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
    problem.setType(URI.create("https://vista.example/errors/not-found"));
    problem.setTitle("Not Found");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "NOT_FOUND");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(AccessDeniedException.class)
  ProblemDetail accessDenied(AccessDeniedException exception, HttpServletRequest request) {
    var problem =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này");
    problem.setType(URI.create("https://vista.example/errors/forbidden"));
    problem.setTitle("Forbidden");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "FORBIDDEN");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(Exception.class)
  ProblemDetail unexpected(Exception exception, HttpServletRequest request) {
    log.error("Unhandled exception for request: {}", request.getRequestURI(), exception);
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

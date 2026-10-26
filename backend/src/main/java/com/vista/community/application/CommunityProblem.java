package com.vista.community.application;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

public final class CommunityProblem {
  private CommunityProblem() {}

  public static ErrorResponseException of(HttpStatus status, String code, String detail) {
    var body = ProblemDetail.forStatusAndDetail(status, detail);
    body.setProperty("code", code);
    body.setProperty("requestId", org.slf4j.MDC.get("requestId"));
    return new ErrorResponseException(status, body, null);
  }
}

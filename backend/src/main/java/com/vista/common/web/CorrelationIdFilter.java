package com.vista.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class CorrelationIdFilter extends OncePerRequestFilter {
  public static final String HEADER = "X-Request-ID";

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String incoming = request.getHeader(HEADER);
    String requestId =
        incoming != null && incoming.matches("[A-Za-z0-9._-]{1,64}")
            ? incoming
            : UUID.randomUUID().toString();
    MDC.put("requestId", requestId);
    response.setHeader(HEADER, requestId);
    long started = System.nanoTime();
    try {
      chain.doFilter(request, response);
    } finally {
      long durationMs = (System.nanoTime() - started) / 1_000_000;
      logger.info(
          "method="
              + request.getMethod()
              + " path="
              + request.getRequestURI()
              + " status="
              + response.getStatus()
              + " durationMs="
              + durationMs);
      MDC.remove("requestId");
    }
  }
}

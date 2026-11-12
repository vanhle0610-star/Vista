package com.vista.destination.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DestinationInUseException extends RuntimeException {
  public DestinationInUseException(String message) {
    super(message);
  }
}

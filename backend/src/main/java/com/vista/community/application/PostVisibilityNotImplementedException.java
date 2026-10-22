package com.vista.community.application;

/** Development stub signal: no database write or successful moderation has occurred. */
public final class PostVisibilityNotImplementedException extends UnsupportedOperationException {
  public static final String CODE = "POST_VISIBILITY_NOT_IMPLEMENTED";

  public PostVisibilityNotImplementedException() {
    super("Development stub only: post visibility was not persisted");
  }
}

package com.vista.community.infrastructure;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Configurable operational limits within the API/schema's 5 MiB / four-photo hard caps. */
@ConfigurationProperties("vista.community")
public record CommunityLimits(
    @DefaultValue("5242880") long maxPhotoBytes,
    @DefaultValue("12") int maxPendingUploads,
    @DefaultValue("24") int uploadTtlHours) {
  public CommunityLimits {
    if (maxPhotoBytes < 1024
        || maxPhotoBytes > 5242880
        || maxPendingUploads < 1
        || maxPendingUploads > 100
        || uploadTtlHours < 1
        || uploadTtlHours > 168) {
      throw new IllegalArgumentException("Invalid community upload limits");
    }
  }
}

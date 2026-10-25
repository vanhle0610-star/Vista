package com.vista.community.infrastructure;

import jakarta.servlet.MultipartConfigElement;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@EnableConfigurationProperties(CommunityLimits.class)
public class CommunityConfiguration {
  @Bean
  MultipartConfigElement communityMultipartConfig() {
    // Per-file image validation is 5 MiB; leave room for multipart boundaries.
    return new MultipartConfigElement("", 6L * 1024 * 1024, 6L * 1024 * 1024, 0);
  }
}

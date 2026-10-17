package com.vista.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {
  @Bean
  OpenAPI vistaOpenApi() {
    return new OpenAPI()
        .info(new Info().title("VISTA API").version("v1").description("Vietnam Smart Travel API"));
  }
}

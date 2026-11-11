package com.vista.support;

import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

/** Provisions the Supabase-owned tables in disposable PostgreSQL test containers. */
public final class SupabaseStorageFixture {
  private SupabaseStorageFixture() {}

  public static void initialize(String jdbcUrl, String username, String password) {
    var dataSource = new DriverManagerDataSource(jdbcUrl, username, password);
    new ResourceDatabasePopulator(new ClassPathResource("db/fixtures/supabase_storage.sql"))
        .execute(dataSource);
  }
}

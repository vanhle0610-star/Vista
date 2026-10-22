package com.vista.community;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

class Tv5MigrationOrderTest {
  @Test
  void tv5DeltaRunsAfterExistingMigrations() throws Exception {
    var resources =
        new PathMatchingResourcePatternResolver().getResources("classpath*:db/migration/V*__*.sql");
    var versions = new ArrayList<MigrationVersion>();
    for (var resource : resources) {
      String name = resource.getFilename();
      versions.add(MigrationVersion.fromVersion(name.substring(1, name.indexOf("__"))));
    }
    var tv5 = MigrationVersion.fromVersion("202610210900");
    assertThat(versions).contains(tv5).doesNotHaveDuplicates();
    versions.sort(MigrationVersion::compareTo);
    assertThat(versions)
        .containsSubsequence(
            MigrationVersion.fromVersion("202610171200"),
            MigrationVersion.fromVersion("202610191200"),
            MigrationVersion.fromVersion("202610191400"),
            tv5);
  }
}

package com.vista.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vista.ai.util.ProvinceAliasResolver;
import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProvinceAliasResolverTest {

  @Test
  void mapsPopularTouristCitiesToOfficialProvinceNames() {
    assertThat(ProvinceAliasResolver.resolveProvinceName("Phú Quốc")).isEqualTo("Kiên Giang");
    assertThat(ProvinceAliasResolver.resolveProvinceName("Đà Lạt")).isEqualTo("Lâm Đồng");
    assertThat(ProvinceAliasResolver.resolveProvinceName("Hội An")).isEqualTo("Quảng Nam");
    assertThat(ProvinceAliasResolver.resolveProvinceName("Nha Trang")).isEqualTo("Khánh Hòa");
    assertThat(ProvinceAliasResolver.resolveProvinceName("Sapa")).isEqualTo("Lào Cai");
    assertThat(ProvinceAliasResolver.resolveProvinceName("Đà Nẵng")).isEqualTo("Đà Nẵng");
  }

  @Test
  void searchesUsingResolvedProvinceForPhuQuoc() {
    DestinationQueryService queryService = mock(DestinationQueryService.class);
    DestinationSummary sample =
        new DestinationSummary(
            UUID.randomUUID(),
            "VinWonders Phú Quốc",
            "Kiên Giang",
            "Giải trí",
            BigDecimal.ZERO,
            new BigDecimal("950000"),
            10.33,
            103.85);

    when(queryService.searchPublished(isNull(), eq("Kiên Giang"), isNull(), any(), eq(30)))
        .thenReturn(List.of(sample));

    List<DestinationSummary> results =
        ProvinceAliasResolver.searchPublishedForPlanner(
            queryService, "Phú Quốc", new BigDecimal("6000000"));

    assertThat(results).hasSize(1);
    assertThat(results.get(0).name()).isEqualTo("VinWonders Phú Quốc");
  }
}

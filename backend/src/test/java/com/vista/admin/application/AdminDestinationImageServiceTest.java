package com.vista.admin.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.admin.dto.AiImagePageDto;
import com.vista.admin.dto.DestinationImageAuditItemDto;
import com.vista.admin.dto.ImageUpdateHistoryDto;
import com.vista.common.audit.AuditLogService;
import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AdminDestinationImageServiceTest {

  private DestinationRepository destinationRepository;
  private AuditLogService auditLogService;
  private AdminDestinationImageService service;

  private Destination missingImgDest;
  private Destination duplicateImgDest1;
  private Destination duplicateImgDest2;
  private Destination validImgDest;

  @BeforeEach
  void setUp() {
    destinationRepository = mock(DestinationRepository.class);
    auditLogService = mock(AuditLogService.class);
    service = new AdminDestinationImageService(destinationRepository);
    service.setAuditLogService(auditLogService);

    Province daNang = new Province("Đà Nẵng", "da-nang", "CENTRAL");
    DestinationCategory cat = new DestinationCategory("Di tích & Lịch sử", "landmark");

    missingImgDest = new Destination();
    missingImgDest.setId(UUID.randomUUID());
    missingImgDest.setName("Bảo tàng Đà Nẵng");
    missingImgDest.setProvince(daNang);
    missingImgDest.setCategory(cat);
    missingImgDest.setLatitude(BigDecimal.valueOf(16.075));
    missingImgDest.setLongitude(BigDecimal.valueOf(108.223));

    String sharedUnsplash =
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";

    duplicateImgDest1 = new Destination();
    duplicateImgDest1.setId(UUID.randomUUID());
    duplicateImgDest1.setName("Bảo tàng Điêu khắc Chăm");
    duplicateImgDest1.setProvince(daNang);
    duplicateImgDest1.setCategory(cat);
    duplicateImgDest1.addImage(sharedUnsplash, "Bảo tàng", 0);

    duplicateImgDest2 = new Destination();
    duplicateImgDest2.setId(UUID.randomUUID());
    duplicateImgDest2.setName("Cầu Tình Yêu Đà Nẵng");
    duplicateImgDest2.setProvince(daNang);
    duplicateImgDest2.setCategory(cat);
    duplicateImgDest2.addImage(sharedUnsplash, "Cầu Tình Yêu", 0);

    validImgDest = new Destination();
    validImgDest.setId(UUID.randomUUID());
    validImgDest.setName("Cầu Rồng Đà Nẵng");
    validImgDest.setProvince(daNang);
    validImgDest.setCategory(cat);
    validImgDest.addImage(
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Cau_Rong.jpg/800px-Cau_Rong.jpg",
        "Cầu Rồng",
        0);

    when(destinationRepository.findAll())
        .thenReturn(List.of(missingImgDest, duplicateImgDest1, duplicateImgDest2, validImgDest));
  }

  @Test
  void getPageAndStats_detectsMissingDuplicateSuspiciousAndValidImages() {
    AiImagePageDto page = service.getPageAndStats(null, null, null, "ALL", 0, 20);

    assertEquals(4, page.total());
    assertEquals(4, page.stats().totalDestinations());
    assertEquals(1, page.stats().missingImages());
    assertEquals(2, page.stats().suspiciousImages());
    assertEquals(1, page.stats().validImages());
  }

  @Test
  void applyImageUpdate_savesPreviousImageAndLogsAudit_andSupportsRollback() {
    UUID id = duplicateImgDest1.getId();
    when(destinationRepository.findById(id)).thenReturn(Optional.of(duplicateImgDest1));
    when(destinationRepository.save(any(Destination.class))).thenAnswer(inv -> inv.getArgument(0));

    String oldUrl = duplicateImgDest1.getImages().get(0).getStoragePath();
    String newVerifiedUrl =
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Cham_Museum_Da_Nang.jpg/800px-Cham_Museum_Da_Nang.jpg";

    UUID actorId = UUID.randomUUID();
    DestinationImageAuditItemDto updated =
        service.applyImageUpdate(
            id,
            newVerifiedUrl,
            "Wikipedia Tiếng Việt",
            "https://vi.wikipedia.org/wiki/Bao_tang_Champa",
            "CC BY-SA 4.0",
            92,
            actorId,
            "admin@vista.vn");

    assertEquals(AdminDestinationImageService.STATUS_UPDATED, updated.auditStatus());
    assertEquals(newVerifiedUrl, updated.currentImageUrl());
    assertEquals(oldUrl, updated.previousImageUrl());
    assertEquals(newVerifiedUrl, duplicateImgDest1.getImages().get(0).getStoragePath());
    verify(auditLogService).logAction(any(), any(), any(), any(), any());

    List<ImageUpdateHistoryDto> history = service.getUpdateHistory(10);
    assertTrue(!history.isEmpty());
    assertEquals("UPDATE", history.get(0).action());

    // Now test Rollback
    DestinationImageAuditItemDto rolledBack = service.rollbackImage(id, actorId, "admin@vista.vn");
    assertEquals(oldUrl, rolledBack.currentImageUrl());
    assertEquals(oldUrl, duplicateImgDest1.getImages().get(0).getStoragePath());
  }

  @Test
  void applyImageUpdate_rejectsLowConfidenceCandidate() {
    UUID id = missingImgDest.getId();
    when(destinationRepository.findById(id)).thenReturn(Optional.of(missingImgDest));

    assertThrows(
        IllegalArgumentException.class,
        () ->
            service.applyImageUpdate(
                id,
                "https://example.com/low-confidence.jpg",
                "Unknown",
                null,
                null,
                30,
                UUID.randomUUID(),
                "admin@vista.vn"));
  }
}

package com.vista.destination.api;

import com.vista.common.security.UserPrincipal;
import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationPageDto;
import com.vista.destination.service.DestinationNotFoundException;
import com.vista.destination.service.DestinationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.net.URI;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/destinations")
@Tag(name = "Destinations", description = "Điểm đến du lịch (BF-01)")
public class DestinationController {

  private final DestinationService destinationService;

  public DestinationController(DestinationService destinationService) {
    this.destinationService = destinationService;
  }

  @GetMapping
  @Operation(
      summary = "Tìm kiếm và lọc danh sách điểm đến published (FR-DEST-02, 03)",
      description =
          "Trả về danh sách các điểm đến công khai theo từ khóa, tỉnh thành, loại hình hoặc khoảng giá")
  public ResponseEntity<DestinationPageDto> listDestinations(
      @Parameter(description = "Từ khóa tìm kiếm tiếng Việt (có dấu hoặc không dấu)")
          @RequestParam(required = false)
          String keyword,
      @Parameter(description = "Tên tỉnh thành (ví dụ Đà Nẵng, Thừa Thiên Huế)")
          @RequestParam(required = false)
          String province,
      @Parameter(description = "Danh mục (Cảnh quan, Di tích, Ẩm thực,...)")
          @RequestParam(required = false)
          String category,
      @Parameter(description = "Mức giá vé tối đa") @RequestParam(required = false)
          BigDecimal priceMax,
      @Parameter(description = "Số trang (bắt đầu từ 0)") @RequestParam(defaultValue = "0")
          int page,
      @Parameter(description = "Số lượng bản ghi mỗi trang (tối đa 100)")
          @RequestParam(defaultValue = "20")
          int size) {

    DestinationPageDto result =
        destinationService.searchPublished(keyword, province, category, priceMax, page, size);
    return ResponseEntity.ok(result);
  }

  @GetMapping("/{id}")
  @Operation(
      summary = "Xem thông tin chi tiết một điểm đến (FR-DEST-04)",
      description = "Trả về thông tin chi tiết của điểm đến nếu đã được xuất bản (PUBLISHED)")
  public ResponseEntity<DestinationDetailDto> getDestinationDetail(
      @Parameter(description = "Mã định danh duy nhất của điểm đến (UUID)", required = true)
          @PathVariable
          UUID id,
      @AuthenticationPrincipal UserPrincipal userPrincipal) {

    UUID currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
    DestinationDetailDto detail = destinationService.getPublishedDetail(id, currentUserId);
    return ResponseEntity.ok(detail);
  }

  @ExceptionHandler(DestinationNotFoundException.class)
  public ProblemDetail handleDestinationNotFound(
      DestinationNotFoundException ex, HttpServletRequest request) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    problem.setType(URI.create("https://vista.example/errors/not-found"));
    problem.setTitle("Destination Not Found");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "DESTINATION_NOT_FOUND");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }
}

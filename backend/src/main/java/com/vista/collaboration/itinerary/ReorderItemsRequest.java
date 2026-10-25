package com.vista.collaboration.itinerary;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

/**
 * Request sắp xếp lại thứ tự các điểm dừng trong 1 ngày. orderedItemIds: danh sách UUID theo thứ tự
 * mới (đầy đủ, không thiếu phần tử).
 */
public record ReorderItemsRequest(
    @NotNull(message = "Danh sách thứ tự không được null") List<UUID> orderedItemIds) {}

"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Check,
  MapPin,
  Search,
  X,
  LocateFixed,
  ChevronRight,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useGeolocation } from "@/features/map-location/hooks/useGeolocation";
import {
  FEELINGS,
  nearbyPlaces,
  normalizeSearch,
  formatDistance,
  PLACE_PAGE_SIZE,
  type FeelingCode,
  type Place,
  type PlacePage,
} from "./model";
import { usePlaceSearch } from "./usePlaceSearch";
import css from "./communityExtras.module.css";

export function PublicAvatar({
  author,
}: {
  author?: { displayName?: string | null; avatarUrl?: string | null } | null;
}) {
  const [failed, setFailed] = useState(false);
  const url = author?.avatarUrl;
  useEffect(() => {
    queueMicrotask(() => setFailed(false));
  }, [url]);
  if (url && /^https?:\/\//.test(url) && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={css.avatar}
        src={url}
        alt={`Avatar ${author?.displayName || "Người dùng VISTA"}`}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={css.avatar} aria-hidden="true">
      {author?.displayName?.trim().slice(0, 1).toUpperCase() || "V"}
    </span>
  );
}

function PickerDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={css.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), [href], [tabindex="0"]',
          ),
        ].filter((element) => element.getClientRects().length > 0);
        const first = focusable[0],
          last = focusable.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === event.currentTarget)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <header className={css.pickerHeader}>
        <div>
          <span className={css.eyebrow}>CHIA SẺ CÙNG VISTA</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          type="button"
          className={css.iconButton}
          onClick={onClose}
          aria-label="Đóng popup"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}

function SearchField({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <div className={css.searchField}>
      <Search size={18} aria-hidden="true" />
      <input
        autoFocus
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className={css.iconButton}
          onClick={() => onChange("")}
          aria-label={"Xóa tìm kiếm"}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function FeelingPicker({
  value,
  onChange,
  onClose,
}: {
  value: string | null;
  onChange: (code: FeelingCode | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const items = FEELINGS.filter((item) =>
    normalizeSearch(item.label).includes(normalizeSearch(query)),
  );
  return (
    <PickerDialog title="Bạn đang cảm thấy thế nào?" onClose={onClose}>
      <div className={css.pickerControls}>
        <SearchField
          value={query}
          onChange={setQuery}
          label="Tìm cảm xúc"
          placeholder="Tìm cảm xúc…"
        />
      </div>
      <div className={css.pickerScroll}>
        <p className={css.listHeading}>
          {query ? "Kết quả tìm kiếm" : "Cảm xúc của bạn"}
        </p>
        <div className={css.feelings}>
          {items.map((item) => (
            <button
              key={item.code}
              type="button"
              aria-pressed={value === item.code}
              onClick={() => {
                onChange(item.code);
                onClose();
              }}
            >
              <span className={css.emoji} aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {value === item.code && (
                <Check size={17} className={css.selection} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        {!items.length && (
          <p className={css.empty} role="status">
            Không tìm thấy cảm xúc phù hợp. Thử từ khóa khác nhé.
          </p>
        )}
      </div>
      <footer className={css.pickerFooter}>
        <span>Chọn một cảm xúc cho bài chia sẻ.</span>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              onClose();
            }}
          >
            Bỏ cảm xúc
          </button>
        )}
      </footer>
    </PickerDialog>
  );
}

const fetchPlaces = (keyword: string, page: number, signal: AbortSignal) =>
  apiRequest<PlacePage>(
    `/destinations?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${PLACE_PAGE_SIZE}`,
    { signal },
  );

function PlaceImage({ place }: { place: Place }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={css.placeImage}>
      <MapPin size={22} aria-hidden="true" />
      {place.imageUrl && /^https?:\/\//.test(place.imageUrl) && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={place.imageUrl} alt="" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

export function PlacePicker({
  value,
  onSelect,
  onClose,
}: {
  value?: string | null;
  onSelect: (place: Place) => void;
  onClose: () => void;
}) {
  const search = usePlaceSearch(fetchPlaces);
  const gps = useGeolocation({ transient: true });
  const validGps =
    gps.coords &&
    Number.isFinite(gps.coords.latitude) &&
    Number.isFinite(gps.coords.longitude) &&
    Math.abs(gps.coords.latitude) <= 90 &&
    Math.abs(gps.coords.longitude) <= 180
      ? gps.coords
      : null;
  const items = nearbyPlaces(search.places, validGps, Infinity);
  return (
    <PickerDialog title="Gắn địa điểm" onClose={onClose}>
      <div className={css.pickerControls}>
        <SearchField
          value={search.query}
          onChange={search.setQuery}
          label="Tìm địa điểm"
          placeholder="Tìm địa điểm…"
        />
        <div className={css.gpsRow}>
          <p className={css.muted}>
            Dùng vị trí để ưu tiên địa điểm gần bạn. Bạn vẫn có thể tìm theo
            tên.
          </p>
          <button
            type="button"
            className={css.gpsButton}
            disabled={
              gps.status === "requesting" ||
              gps.status === "denied" ||
              gps.status === "unsupported"
            }
            onClick={gps.requestCurrentPosition}
          >
            <LocateFixed size={16} aria-hidden="true" />
            {gps.status === "requesting"
              ? "Đang định vị…"
              : validGps
                ? "Cập nhật vị trí"
                : "Dùng vị trí"}
          </button>
        </div>
        {gps.errorMessage && (
          <p className={css.muted} role="status">
            {gps.errorMessage} Bạn vẫn có thể tìm theo tên.
          </p>
        )}
      </div>
      <div className={css.pickerScroll} aria-busy={search.loading}>
        <p className={css.listHeading}>
          {search.query.trim()
            ? "Kết quả tìm kiếm"
            : validGps
              ? "Gần bạn"
              : "Địa điểm gợi ý"}
          <span>{search.places.length} địa điểm đã tải</span>
        </p>
        {validGps && (
          <p className={css.muted}>
            Ưu tiên gần trong các kết quả đã tải; chưa tìm gần nhất toàn hệ
            thống. Khoảng cách đường chim bay ước tính.
            {validGps.accuracy > 1000 ? " Độ chính xác GPS thấp." : ""}
          </p>
        )}
        {!search.loading && !search.error && !items.length && (
          <p className={css.empty} role="status">
            Không tìm thấy địa điểm phù hợp. Thử tên hoặc khu vực khác.
          </p>
        )}
        <ul className={css.places}>
          {items.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                aria-pressed={value === place.id}
                onClick={() => {
                  onSelect(place);
                  onClose();
                }}
              >
                <PlaceImage place={place} />
                <span className={css.placeText}>
                  <strong>{place.name}</strong>
                  <span>
                    {place.province || place.area || "Địa điểm VISTA"}
                  </span>
                  {Number.isFinite(place.distance) && (
                    <small>{formatDistance(place.distance)}</small>
                  )}
                </span>
                {value === place.id ? (
                  <Check
                    size={19}
                    className={css.selection}
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronRight
                    size={17}
                    className={css.rowArrow}
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
        {search.loading && (
          <p className={css.empty} role="status">
            Đang tải địa điểm…
          </p>
        )}
        {search.error && (
          <div className={css.empty} role="alert">
            <p>Không tải được địa điểm. Vui lòng thử lại.</p>
            <button type="button" onClick={search.retry}>
              Thử lại địa điểm
            </button>
          </div>
        )}
        {search.hasMore && !search.error && (
          <button
            type="button"
            className={css.loadMore}
            disabled={search.loading}
            onClick={search.loadMore}
          >
            Tải thêm địa điểm
          </button>
        )}
      </div>
      <footer className={css.pickerFooter}>
        <MapPin size={15} aria-hidden="true" />
        <span>Địa điểm bạn chọn sẽ xuất hiện cùng bài đăng.</span>
      </footer>
    </PickerDialog>
  );
}

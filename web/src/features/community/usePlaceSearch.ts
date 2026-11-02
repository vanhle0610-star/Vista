import { useCallback, useEffect, useRef, useState } from "react";
import { type Place, type PlacePage } from "./model";

/** Public TV1 pagination, with cancellation on query change and unmount. */
export function usePlaceSearch(
  fetchPage: (
    keyword: string,
    page: number,
    signal: AbortSignal,
  ) => Promise<PlacePage>,
) {
  const [query, updateQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(-1);
  const [hasMore, setHasMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const active = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const failedPage = useRef(0);
  const request = useCallback(
    async (keyword: string, nextPage: number, controller: AbortController) => {
      if (controller.signal.aborted) return;
      busy.current = true;
      setLoading(true);
      setError("");
      failedPage.current = nextPage;
      try {
        const data = await fetchPage(keyword, nextPage, controller.signal);
        if (controller.signal.aborted || active.current !== controller) return;
        const visible = data.items.filter(
          (item) => item.status === "PUBLISHED",
        );
        setPlaces((old) => [
          ...new Map(
            [...(nextPage ? old : []), ...visible].map((item) => [
              item.id,
              item,
            ]),
          ).values(),
        ]);
        setPage(data.page);
        setHasMore(
          data.items.length > 0 && (data.page + 1) * data.size < data.total,
        );
      } catch (reason) {
        if (!controller.signal.aborted && active.current === controller)
          setError(
            reason instanceof Error
              ? reason.message
              : "Không tải được địa điểm. Vui lòng thử lại.",
          );
      } finally {
        if (!controller.signal.aborted && active.current === controller) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [fetchPage],
  );
  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    const timer = setTimeout(
      () => {
        void request(query.trim(), 0, controller);
      },
      query.trim() ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      active.current?.abort();
      controller.abort();
    };
  }, [query, revision, request]);
  const setQuery = (value: string) => {
    if (value === query) return;
    active.current?.abort();
    busy.current = false;
    setPlaces([]);
    setPage(-1);
    setHasMore(false);
    setError("");
    setLoading(true);
    updateQuery(value);
  };
  const load = (next: number) => {
    if (loading || busy.current) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    void request(query.trim(), next, controller);
  };
  return {
    query,
    setQuery,
    places,
    loading,
    error,
    hasMore,
    loadMore: () => load(page + 1),
    retry: () => {
      if (failedPage.current > 0) load(failedPage.current);
      else {
        setLoading(true);
        setError("");
        setRevision((n) => n + 1);
      }
    },
  };
}

'use client';

import { useState, useMemo, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, CirclePlus, ArrowUp, ArrowDown, LoaderCircle } from 'lucide-react';
import type { Coordinates, DestinationMarker, GeolocationStatus } from '../types';
import type { RouteResult, TravelMode } from '../routing/routes';
import { createStop, moveStop, stopRole, MAX_ROUTE_POINTS, type PlannerStop } from '../routing/stops';
import { REGIONS_PROVINCES } from './DestinationList';
import { IconPin, IconClose, IconCar, IconWalk, IconCrosshair } from './MapIcons';
import styles from './DirectionsPanel.module.css';

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
interface Props {
  destinations: DestinationMarker[];
  coords: Coordinates | null;
  stops: PlannerStop[];
  onStopsChange: (stops: PlannerStop[]) => void;
  mode: TravelMode;
  onMode: (mode: TravelMode) => void;
  selectedProvince?: string;
  onProvinceChange?: (province: string) => void;
  onRequestGps: () => void;
  gpsStatus: GeolocationStatus;
  gpsError: string | null;
  onCompute: () => void;
  onClear: () => void;
  onClose: () => void;
  status: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  error: string | null;
  route: RouteResult | null;
}

function SearchableStopInput({ stop, onChange, destinations, allowGps, onRequestGps, loading, label, focusId }: {
  stop: PlannerStop; onChange: (value: string) => void; destinations: DestinationMarker[];
  allowGps: boolean; onRequestGps: () => void; loading: boolean; label: string; focusId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 260 });
  const input = useRef<HTMLInputElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = destinations.find((destination) => destination.id === stop.placeId);
  const selectedText = stop.placeId === 'gps' ? 'Vị trí của bạn' : selected ? selected.name + ' · ' + selected.province : '';
  const filtered = useMemo(() => destinations.filter((destination) => normalize(destination.name + ' ' + destination.province + ' ' + destination.category).includes(normalize(draft ?? ''))).slice(0, 35), [destinations, draft]);
  const options = [...(allowGps ? [{ id: 'gps', name: 'Vị trí của bạn', meta: 'Dùng vị trí thực của thiết bị' }] : []), ...filtered.map((destination) => ({ id: destination.id, name: destination.name, meta: destination.province + ' · ' + destination.category }))];
  const choose = (id: string) => {
    onChange(id); setDraft(null); setOpen(false);
    if (id === 'gps') onRequestGps();
    input.current?.focus();
    // focus() may open the popup again; close it after that event.
    setOpen(false);
  };
  useEffect(() => {
    if (focusId === stop.id) { input.current?.focus(); input.current?.scrollIntoView({ block: 'nearest' }); }
  }, [focusId, stop.id]);
  useEffect(() => {
    if (open) popup.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = input.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const below = viewportBottom - rect.bottom - 10;
      const above = rect.top - viewportTop - 10;
      const height = Math.max(0, Math.min(260, Math.max(below, above)));
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), width: rect.width, top: below >= Math.min(180, above) ? rect.bottom + 4 : Math.max(viewportTop + 4, rect.top - height - 4), maxHeight: height });
    };
    const outside = (event: PointerEvent) => {
      if (!input.current?.parentElement?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) { setOpen(false); setDraft(null); }
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true);
      window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);
  return <div className={styles.comboboxContainer}>
    <input ref={input} id={stop.id} className={styles.comboboxInput} role="combobox" autoComplete="off"
      aria-label={label} aria-expanded={open} aria-controls={open ? listId : undefined} aria-autocomplete="list"
      aria-activedescendant={open && options[active] ? listId + '-' + active : undefined}
      title={selectedText || label} placeholder={label} value={draft ?? selectedText}
      onFocus={() => { setOpen(true); setActive(0); }}
      onClick={() => setOpen(true)}
      onBlur={() => { requestAnimationFrame(() => { if (!popup.current?.contains(document.activeElement) && document.activeElement !== input.current) { setOpen(false); setDraft(null); } }); }}
      onChange={(event) => { setDraft(event.target.value); setOpen(true); setActive(0); if (stop.placeId) onChange(''); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { setOpen(false); setDraft(null); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive((index) => Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))); }
        if (event.key === 'Enter' && open) { event.preventDefault(); if (options[active]) choose(options[active].id); }
        if (event.key === 'Tab') setOpen(false);
      }} />
    {loading && <LoaderCircle className={styles.inputSpinner} size={18} aria-label="Đang xác định vị trí" />}
    {!loading && stop.placeId && <button type="button" className={styles.clearInput} aria-label={'Xóa nội dung ' + label.toLowerCase()} onClick={() => { onChange(''); setDraft(''); input.current?.focus(); }}><IconClose size={12} /></button>}
    {open && createPortal(<div ref={popup} id={listId} role="listbox" aria-label={'Gợi ý ' + label.toLowerCase()} className={styles.dropdownList} style={position}>
      {options.map((option, index) => <button type="button" role="option" aria-selected={active === index} id={listId + '-' + index} key={option.id} className={styles.dropdownItem}
        onPointerDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(option.id)}>
        {option.id === 'gps' && <IconCrosshair size={16} />}<span><strong>{option.name}</strong><small>{option.meta}</small></span>
      </button>)}
      {!options.length && <p className={styles.dropdownEmpty}>Không tìm thấy địa điểm phù hợp</p>}
    </div>, document.body)}
  </div>;
}

export function DirectionsPanel(props: Props) {
  const { stops, destinations, route, mode, status } = props;
  const [focusId, setFocusId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dragged = useRef<string | null>(null);
  const update = (id: string, placeId: string) => props.onStopsChange(stops.map((stop) => stop.id === id ? { ...stop, placeId } : stop));
  const reorder = (id: string, target: number) => { props.onStopsChange(moveStop(stops, id, target)); setFocusId(null); };
  const valid = stops.every((stop, index) => stop.placeId === 'gps' ? index === 0 && Boolean(props.coords) && props.gpsStatus !== 'requesting' : destinations.some((destination) => destination.id === stop.placeId));
  return <section className={styles.panel} aria-label="Lên lịch trình VISTA">
    <header className={styles.heading}><div><h2>Lộ trình của bạn</h2><p>Đi qua các điểm theo thứ tự đã chọn</p></div><button type="button" className={styles.close} onClick={props.onClose} aria-label="Thu gọn lộ trình"><IconClose size={18} /></button></header>
    <div className={styles.scrollContent}>
      <div className={styles.modePills} role="group" aria-label="Phương tiện">
        <button type="button" aria-pressed={mode === 'DRIVING'} onClick={() => props.onMode('DRIVING')}><IconCar size={18} /> Ô tô</button>
        <button type="button" aria-pressed={mode === 'WALKING'} onClick={() => props.onMode('WALKING')}><IconWalk size={18} /> Đi bộ</button>
      </div>
      <label className={styles.scopeBar}>Khu vực
        <select value={props.selectedProvince ?? 'all'} onChange={(event) => props.onProvinceChange?.(event.target.value)}>
          <option value="all">Toàn quốc</option>{REGIONS_PROVINCES.flatMap((region) => region.provinces).filter((province) => destinations.some((destination) => normalize(destination.province).includes(normalize(province)))).map((province) => <option key={province}>{province}</option>)}
        </select>
      </label>
      <form onSubmit={(event) => { event.preventDefault(); props.onCompute(); }}>
        <div className={styles.stepper}>
          {stops.map((stop, index) => {
            const role = stopRole(index, stops.length);
            const last = index === stops.length - 1;
            return <div key={stop.id} className={styles.stopRow} data-stop-id={stop.id} data-role={index === 0 ? 'origin' : last ? 'destination' : 'waypoint'}
              onDragOver={(event) => { if (index > 0) event.preventDefault(); }}
              onDrop={(event) => { event.preventDefault(); if (dragged.current && index > 0) reorder(dragged.current, index); dragged.current = null; }}>
              <div className={styles.dragCell}>{index > 0 && !last && <button type="button" draggable className={styles.dragHandle} aria-label={'Kéo ' + role.toLowerCase() + ' hoặc dùng Alt và phím mũi tên để sắp xếp'}
                onDragStart={(event) => { dragged.current = stop.id; event.dataTransfer.setData('text/plain', stop.id); }} onDragEnd={() => { dragged.current = null; }}
                onKeyDown={(event) => { if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); reorder(stop.id, index + (event.key === 'ArrowUp' ? -1 : 1)); } }}><GripVertical size={16} /></button>}</div>
              <div className={styles.stopIcon} aria-hidden="true">{last ? <IconPin size={22} className={styles.destinationPin} /> : <span className={styles.stopCircle} />}{!last && <span className={styles.connector} />}</div>
              <SearchableStopInput stop={stop} label={role} destinations={destinations} allowGps={index === 0} onChange={(value) => update(stop.id, value)} onRequestGps={props.onRequestGps} loading={index === 0 && stop.placeId === 'gps' && props.gpsStatus === 'requesting'} focusId={focusId} />
              <div className={styles.reorder}>{index > 0 && <>
                <button type="button" disabled={index === 1} aria-label={'Di chuyển ' + role.toLowerCase() + ' lên'} onClick={() => reorder(stop.id, index - 1)}><ArrowUp size={13} /></button>
                <button type="button" disabled={last} aria-label={'Di chuyển ' + role.toLowerCase() + ' xuống'} onClick={() => reorder(stop.id, index + 1)}><ArrowDown size={13} /></button>
              </>}</div>
              <button type="button" className={styles.remove} aria-label={(stops.length <= 2 || index === 0 ? 'Xóa nội dung ' : 'Xóa ') + role.toLowerCase()}
                onClick={() => { if (stops.length <= 2 || index === 0) update(stop.id, ''); else props.onStopsChange(stops.filter((item) => item.id !== stop.id)); }}><IconClose size={17} /></button>
            </div>;
          })}
        </div>
        <button type="button" className={styles.addStop} aria-disabled={stops.length >= MAX_ROUTE_POINTS} onClick={() => {
          if (stops.length >= MAX_ROUTE_POINTS) { setNotice('Lộ trình hỗ trợ tối đa ' + MAX_ROUTE_POINTS + ' điểm. Hãy xóa một điểm trước khi thêm.'); return; }
          const next = createStop(); props.onStopsChange([...stops, next]); setFocusId(next.id); setNotice(null);
        }}><CirclePlus size={24} /> <span>Thêm điểm đến</span></button>
        {(notice || stops.length >= MAX_ROUTE_POINTS) && <p className={styles.notice} role="status">{notice || 'Đã đạt giới hạn ' + MAX_ROUTE_POINTS + ' điểm cho mỗi lộ trình.'}</p>}
        {stops[0].placeId === 'gps' && props.gpsError && <p role="alert" className={styles.error}>{props.gpsError} Bạn có thể nhập điểm xuất phát khác hoặc <button type="button" onClick={props.onRequestGps}>thử lại GPS</button>.</p>}
        <button className={styles.compute} type="submit" disabled={!valid || status === 'loading'}>{status === 'loading' ? 'Đang tìm đường…' : 'Tìm đường' + (stops.length > 2 ? ' qua ' + stops.length + ' điểm' : '')}</button>
      </form>
      {status === 'error' && <p className={styles.error} role="alert">{props.error}</p>}
      {status === 'empty' && <p className={styles.notice} role="status">Không tìm thấy tuyến đi qua đủ các điểm. Hãy chọn địa điểm hoặc phương tiện khác.</p>}
      {route && <section className={styles.resultCard} aria-label="Kết quả lộ trình">
        <div className={styles.resultHeader}><strong>{Math.ceil(route.durationMillis / 60000)} phút · {(route.distanceMeters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km</strong><button type="button" onClick={props.onClear}>Xóa tuyến</button></div>
        <p className={styles.routeTitle}>{route.input.origin.label} → {route.input.destination.label}</p>
        {route.legs?.map((leg, index) => <div className={styles.leg} key={index}>
          <span className={styles.legRole}>{stopRole(index, stops.length)} → {stopRole(index + 1, stops.length)}</span>
          <p>{leg.fromLabel} → {leg.toLabel}</p><small>{Math.ceil(leg.durationMillis / 60000)} phút · {(leg.distanceMeters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km</small>
        </div>)}
        {route.warnings.map((warning) => <p className={styles.notice} key={warning}>{warning}</p>)}
        <small className={styles.attribution}>{route.attribution}</small>
        <a className={styles.mapFeedback} href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Báo lỗi dữ liệu bản đồ ↗</a>
      </section>}
    </div>
  </section>;
}

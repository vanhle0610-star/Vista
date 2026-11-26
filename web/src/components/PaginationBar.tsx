'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationBarProps {
  page: number;
  totalPages: number;
  size: number;
  total?: number;
  unitLabel?: string;
  disabled?: boolean;
  onPageChange: (newPage: number) => void;
  onSizeChange: (newSize: number) => void;
}

const SIZE_OPTIONS = [10, 20, 50];

export function PaginationBar({
  page,
  totalPages,
  size,
  total,
  unitLabel = 'địa điểm',
  disabled = false,
  onPageChange,
  onSizeChange,
}: PaginationBarProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const currentPageDisplay = Math.min(page + 1, safeTotalPages);
  const canPrev = !disabled && page > 0;
  const canNext = !disabled && page + 1 < safeTotalPages;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.9rem 1.25rem',
        borderTop: '1px solid #e2e8f0',
        background: '#f8fafc',
        fontSize: '0.875rem',
        color: '#475569',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: '#0f172a' }}>
          Trang {currentPageDisplay} / {safeTotalPages}
        </span>
        {typeof total === 'number' && (
          <span style={{ color: '#64748b' }}>
            (Tổng cộng <strong style={{ color: '#0f172a' }}>{total}</strong> {unitLabel})
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <span>Hiển thị:</span>
          <select
            value={size}
            disabled={disabled}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / trang
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => canPrev && onPageChange(page - 1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: canPrev ? '#ffffff' : '#f1f5f9',
              color: canPrev ? '#0f172a' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: canPrev ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            <ChevronLeft size={16} />
            Trước
          </button>

          <button
            type="button"
            disabled={!canNext}
            onClick={() => canNext && onPageChange(page + 1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: canNext ? '#ffffff' : '#f1f5f9',
              color: canNext ? '#0f172a' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: canNext ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            Sau
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaginationBar;


'use client';

/**
 * DataTable Component
 * Responsive table with automatic desktop/mobile layout switching
 * Eliminates duplicated table code across components
 */

import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  // Render function for custom cell content
  render?: (item: T, index: number) => React.ReactNode;
  // Simple accessor for basic text content
  accessor?: keyof T;
  // Alignment
  align?: 'left' | 'center' | 'right';
  // Hide on mobile
  hideOnMobile?: boolean;
  // Width (Tailwind class like 'w-20')
  width?: string;
  // Sortable
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string;
  // Optional row click handler
  onRowClick?: (item: T, index: number) => void;
  // Loading state
  isLoading?: boolean;
  // Empty state message
  emptyMessage?: string;
  // Class names
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  // Compact mode (less padding)
  compact?: boolean;
  // Striped rows
  striped?: boolean;
  // Hover effect
  hoverable?: boolean;
  // Sticky header
  stickyHeader?: boolean;
}

function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No hay datos disponibles',
  className = '',
  headerClassName = '',
  rowClassName = '',
  compact = false,
  striped = false,
  hoverable = true,
  stickyHeader = false,
}: DataTableProps<T>) {
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  const getCellPadding = () => {
    return compact ? 'px-2 py-1.5' : 'px-3 py-2';
  };

  const getRowClassName = (item: T, index: number) => {
    const baseClass = typeof rowClassName === 'function'
      ? rowClassName(item, index)
      : rowClassName;

    const stripedClass = striped && index % 2 === 1 ? 'bg-zinc-800/30' : '';
    const hoverClass = hoverable ? 'hover:bg-zinc-800/50 transition-colors' : '';
    const clickableClass = onRowClick ? 'cursor-pointer' : '';

    return `${baseClass} ${stripedClass} ${hoverClass} ${clickableClass}`.trim();
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`bg-zinc-900 rounded-md border border-zinc-800 ${className}`}>
        <div className="animate-pulse">
          <div className="border-b border-zinc-800 px-3 py-3 bg-zinc-800/50">
            <div className="h-4 bg-zinc-700 rounded w-1/3"></div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-3 py-3 border-b border-zinc-800 last:border-0">
              <div className="h-4 bg-zinc-700/50 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`bg-zinc-900 rounded-md border border-zinc-800 ${className}`}>
        <div className="px-4 py-8 text-center text-zinc-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  // Filter columns for mobile (hide hideOnMobile columns)
  const visibleColumnsDesktop = columns;
  const visibleColumnsMobile = columns.filter((col) => !col.hideOnMobile);

  return (
    <div className={`bg-zinc-900 rounded-md border border-zinc-800 overflow-hidden ${className}`}>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className={`bg-zinc-800 ${stickyHeader ? 'sticky top-0 z-10' : ''} ${headerClassName}`}>
            <tr>
              {visibleColumnsDesktop.map((column) => (
                <th
                  key={column.key}
                  className={`
                    ${getCellPadding()}
                    ${getAlignClass(column.align)}
                    ${column.width || ''}
                    text-xs font-mono uppercase tracking-wide text-zinc-400
                    ${column.headerClassName || ''}
                  `}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                className={`border-b border-zinc-800 last:border-0 ${getRowClassName(item, index)}`}
                onClick={() => onRowClick?.(item, index)}
              >
                {visibleColumnsDesktop.map((column) => (
                  <td
                    key={column.key}
                    className={`
                      ${getCellPadding()}
                      ${getAlignClass(column.align)}
                      ${column.width || ''}
                      text-zinc-100
                      ${column.cellClassName || ''}
                    `}
                  >
                    {column.render
                      ? column.render(item, index)
                      : column.accessor
                      ? String(item[column.accessor] ?? '')
                      : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Table */}
      <div className="md:hidden overflow-x-auto">
        <table className="w-full">
          <thead className={`bg-zinc-800 ${headerClassName}`}>
            <tr>
              {visibleColumnsMobile.map((column) => (
                <th
                  key={column.key}
                  className={`
                    ${getCellPadding()}
                    ${getAlignClass(column.align)}
                    ${column.width || ''}
                    text-xs font-mono uppercase tracking-wide text-zinc-400
                    ${column.headerClassName || ''}
                  `}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                className={`border-b border-zinc-800 last:border-0 ${getRowClassName(item, index)}`}
                onClick={() => onRowClick?.(item, index)}
              >
                {visibleColumnsMobile.map((column) => (
                  <td
                    key={column.key}
                    className={`
                      ${getCellPadding()}
                      ${getAlignClass(column.align)}
                      ${column.width || ''}
                      text-zinc-100
                      ${column.cellClassName || ''}
                    `}
                  >
                    {column.render
                      ? column.render(item, index)
                      : column.accessor
                      ? String(item[column.accessor] ?? '')
                      : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;

"use client";

import { useMemo, useState } from "react";

/* ─── Types ─── */

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

interface Row {
  id: string;
  [key: string]: string | number | boolean | null;
}

interface DataTableProps {
  columns: Column[];
  rows: Row[];
  onRowClick?: (row: Row) => void;
  pageSize?: number;
  searchable?: boolean;
}

type SortDirection = "asc" | "desc" | null;

/* ─── DataTable Component ─── */

export default function DataTable({
  columns,
  rows,
  onRowClick,
  pageSize = 10,
  searchable = true,
}: DataTableProps) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  /* Filter rows by search query */
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const query = search.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(query);
      })
    );
  }, [rows, search, columns]);

  /* Sort rows */
  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const comparison = String(aVal).localeCompare(String(bVal), undefined, {
        numeric: true,
      });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredRows, sortKey, sortDirection]);

  /* Paginate */
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = sortedRows.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  function handleSort(key: string) {
    if (sortKey === key) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(0);
  }

  /* Reset to first page when search changes */
  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(0);
  }

  /* ─── Empty State ─── */
  if (rows.length === 0) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-bright border border-border">
          <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
        </div>
        <h3 className="font-heading text-base font-semibold text-primary">
          No records yet
        </h3>
        <p className="mt-1 text-sm text-muted max-w-xs mx-auto">
          When you add data, it will appear here in a searchable, sortable table.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      {searchable && (
        <div className="relative max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search records..."
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-4 py-2 text-sm text-primary placeholder:text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap sticky top-0 bg-surface/50 ${
                      col.sortable !== false ? "cursor-pointer select-none hover:text-secondary transition-colors" : ""
                    }`}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable !== false && sortKey === col.key && (
                        <svg
                          className={`w-3 h-3 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                        </svg>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-muted"
                  >
                    No matching records found. Try a different search term.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`transition-colors hover:bg-surface-bright/50 ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-primary whitespace-nowrap"
                      >
                        {row[col.key] != null ? String(row[col.key]) : (
                          <span className="text-muted">--</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted">
              Showing {currentPage * pageSize + 1}
              {" - "}
              {Math.min((currentPage + 1) * pageSize, sortedRows.length)} of{" "}
              {sortedRows.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1.5 text-xs text-secondary rounded-md border border-border hover:border-border-bright hover:bg-surface-bright disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Prev
              </button>
              <span className="text-xs text-muted px-2">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-3 py-1.5 text-xs text-secondary rounded-md border border-border hover:border-border-bright hover:bg-surface-bright disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

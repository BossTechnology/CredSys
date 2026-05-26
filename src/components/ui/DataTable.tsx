"use client";

import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T;
  title?: string;
  subtitle?: string;
  onRowClick?: (row: T) => void;
  isAlertRow?: (row: T) => boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  title,
  subtitle,
  onRowClick,
  isAlertRow,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  return (
    <div className="border border-cs-200 overflow-hidden">
      {title && (
        <div className="bg-black text-white px-4 py-1 flex items-center justify-between">
          <span className="text-[8px] font-mono uppercase tracking-widest font-semibold">
            {title}
          </span>
          {subtitle && (
            <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest">
              {subtitle}
            </span>
          )}
        </div>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  "bg-cs-100 text-cs-400 text-[6.5px] font-mono uppercase tracking-widest px-3 py-1 text-left border-b-2 border-cs-200 font-semibold",
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center text-[8px] font-mono text-cs-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const alert = isAlertRow?.(row);
              return (
                <tr
                  key={String(row[rowKey])}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-cs-50 last:border-b-0",
                    idx % 2 === 0 ? "bg-white" : "bg-cs-50",
                    alert && "bg-cs-red-100",
                    onRowClick && "cursor-pointer hover:bg-cs-100"
                  )}
                >
                  {columns.map((col) => {
                    const value = col.key.toString().includes(".")
                      ? col.key.toString().split(".").reduce((obj: unknown, key) => (obj as Record<string, unknown>)?.[key], row)
                      : row[col.key as keyof T];
                    return (
                      <td
                        key={String(col.key)}
                        className={cn(
                          "px-3 py-2 text-[8px] border-r border-cs-50 last:border-r-0",
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(value, row)
                          : String(value ?? "—")}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

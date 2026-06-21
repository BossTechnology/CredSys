import { cn } from "@/lib/utils";
import Link from "next/link";

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
  rowHref?: (row: T) => string;
  isAlertRow?: (row: T) => boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  title,
  subtitle,
  rowHref,
  isAlertRow,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  return (
    <div className="border border-cs-200 overflow-hidden">
      {title && (
        <div className="bg-black text-white px-4 py-1 flex items-center justify-between">
          <span className="text-[13px] font-mono uppercase tracking-widest font-semibold">
            {title}
          </span>
          {subtitle && (
            <span className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">
              {subtitle}
            </span>
          )}
        </div>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={String(col.key) + "_" + i}
                className={cn(
                  "bg-cs-100 text-cs-400 text-[14px] font-mono uppercase tracking-widest px-3 py-1 text-left border-b-2 border-cs-200 font-semibold",
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
                className="px-3 py-6 text-center text-[13px] font-mono text-cs-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const alert = isAlertRow?.(row);
              const href = rowHref?.(row);
              const rowContent = columns.map((col, i) => {
                const value = row[col.key as keyof T];
                return (
                  <td
                    key={String(col.key) + "_" + i}
                    className={cn(
                      "px-3 py-2 text-[13px] border-r border-cs-50 last:border-r-0 align-middle",
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(value, row)
                      : value === null || value === undefined
                      ? "—"
                      : String(value)}
                  </td>
                );
              });

              const rowClass = cn(
                "border-b border-cs-50 last:border-b-0",
                idx % 2 === 0 ? "bg-white" : "bg-cs-50",
                alert && "bg-cs-red-100",
                href && "cursor-pointer hover:bg-cs-100"
              );

              return (
                <tr key={String(row[rowKey])} className={rowClass}>
                  {rowContent}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

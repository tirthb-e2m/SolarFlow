import type { ReactNode } from "react";

type ChartHeadingProps = {
  kicker: string;
  title: string;
  caption: string;
  unit?: string;
};

export function ChartHeading({ kicker, title, caption, unit }: ChartHeadingProps) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="font-sans text-[0.68rem] font-medium tracking-[0.18em] text-cyan uppercase">
          {kicker}
        </p>
        {unit ? (
          <p className="font-sans text-[0.68rem] tracking-[0.16em] text-mute uppercase">
            {unit}
          </p>
        ) : null}
      </div>
      <h3 className="mt-3 font-display text-[1.7rem] leading-none tracking-[-0.03em] text-paper">
        {title}
      </h3>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-mute">{caption}</p>
    </header>
  );
}

type DataTableProps = {
  caption: string;
  headers: string[];
  rows: string[][];
};

export function DataTable({ caption, headers, rows }: DataTableProps) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} scope="col">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`${caption}-${rowIndex}`}>
            {row.map((cell, cellIndex) =>
              cellIndex === 0 ? (
                <th key={`${rowIndex}-${cellIndex}`} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TooltipCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border border-white/15 bg-navy-deep px-3 py-2.5">
      <p className="font-sans text-[0.65rem] font-medium tracking-[0.16em] text-mute uppercase">
        {label}
      </p>
      <div className="mt-1 space-y-1 font-display text-xl tracking-[-0.03em] text-paper">
        {children}
      </div>
    </div>
  );
}

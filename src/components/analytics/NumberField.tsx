"use client";

import { formatInput } from "@/lib/analytics";
import { cx } from "@/lib/cx";
import { useState } from "react";

type NumberFieldProps = {
  id: string;
  label: string;
  unit: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function NumberField({
  id,
  label,
  unit,
  hint,
  min,
  max,
  step,
  value,
  onChange,
}: NumberFieldProps) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? formatInput(value, step);
  const hintId = `${id}-hint`;

  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3">
        <span className="font-sans text-[0.68rem] font-medium tracking-[0.16em] text-mute uppercase">
          {label}
        </span>
        <span className="font-sans text-[0.68rem] tracking-[0.12em] text-cyan/80 uppercase">
          {unit}
        </span>
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        autoComplete="off"
        min={min}
        max={max}
        step={step}
        value={shown}
        aria-describedby={hintId}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const parsed = Number(next);
          if (next.trim() !== "" && Number.isFinite(parsed) && parsed >= min && parsed <= max) {
            onChange(parsed);
          }
        }}
        onBlur={() => {
          const parsed = Number(shown);
          onChange(clamp(Number.isFinite(parsed) ? parsed : value, min, max));
          setText(null);
        }}
        className={cx(
          "mt-2 w-full border-b border-white/15 bg-transparent py-2 font-display text-[1.65rem] tracking-[-0.03em] text-paper tabular-nums outline-none transition-colors duration-300",
          "focus:border-cyan",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
      <p id={hintId} className="mt-2 text-sm leading-relaxed text-mute">
        {hint}
      </p>
    </div>
  );
}

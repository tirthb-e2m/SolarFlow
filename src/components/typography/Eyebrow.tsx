import { cx } from "@/lib/cx";

type EyebrowProps = {
  index: string;
  label: string;
  className?: string;
};

export function Eyebrow({ index, label, className }: EyebrowProps) {
  return (
    <p
      className={cx(
        "font-sans text-[0.72rem] font-medium tracking-[0.28em] text-mute uppercase",
        className,
      )}
    >
      <span className="text-cyan">{index}</span>
      <span className="px-2 text-white/25">/</span>
      {label}
    </p>
  );
}

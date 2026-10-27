import { cx } from "@/lib/cx";
import type { ReactNode } from "react";

const size = {
  h1: "text-[clamp(2.75rem,7.2vw,6.6rem)]",
  h2: "text-[clamp(2.35rem,4.4vw,4.15rem)]",
  h3: "text-[clamp(1.75rem,2.4vw,2.4rem)]",
} as const;

type DisplayProps = {
  as?: keyof typeof size;
  children: ReactNode;
  className?: string;
};

export function Display({ as = "h1", children, className }: DisplayProps) {
  const Tag = as;

  return (
    <Tag
      className={cx(
        "font-display font-normal tracking-[-0.035em] text-paper",
        size[as],
        as === "h1" ? "leading-[0.9]" : "leading-[0.94]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

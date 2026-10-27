import { cx } from "@/lib/cx";
import type { ReactNode } from "react";

type ProseProps = {
  children: ReactNode;
  className?: string;
};

export function Prose({ children, className }: ProseProps) {
  return (
    <p
      className={cx(
        "max-w-xl font-sans text-base leading-relaxed text-paper/75 md:text-lg",
        className,
      )}
    >
      {children}
    </p>
  );
}

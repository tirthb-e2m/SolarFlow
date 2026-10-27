import { Reveal } from "@/components/motion/Reveal";
import { Display } from "@/components/typography/Display";
import { Eyebrow } from "@/components/typography/Eyebrow";
import { cx } from "@/lib/cx";
import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  index: string;
  kicker: string;
  title: string;
  children: ReactNode;
  className?: string;
  atmosphere?: ReactNode;
};

export function Section({
  id,
  index,
  kicker,
  title,
  children,
  className,
  atmosphere,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cx(
        "relative border-t border-white/10",
        className,
      )}
    >
      {atmosphere}
      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <Eyebrow index={index} label={kicker} />
          <Display as="h2" className="mt-6 max-w-[12ch]">
            {title}
          </Display>
        </Reveal>
        <Reveal className="lg:col-span-7 lg:pt-16">{children}</Reveal>
      </div>
    </section>
  );
}

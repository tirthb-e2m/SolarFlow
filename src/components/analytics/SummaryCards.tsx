import { summaryItems, type PlantResult } from "@/lib/analytics";

type SummaryCardsProps = {
  result: PlantResult;
};

export function SummaryCards({ result }: SummaryCardsProps) {
  const items = summaryItems(result);

  return (
    <dl className="mt-12 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <div key={item.id} className="bg-navy px-4 py-5 md:px-5">
          <dt className="font-sans text-[0.68rem] font-medium tracking-[0.16em] text-mute uppercase">
            {item.label}
          </dt>
          <dd className="mt-4 font-display text-[1.85rem] leading-none tracking-[-0.03em] text-paper tabular-nums">
            {item.value}
          </dd>
          <p className="mt-3 text-sm text-cyan/85">{item.unit}</p>
          <p className="mt-3 text-sm leading-relaxed text-mute">{item.detail}</p>
        </div>
      ))}
    </dl>
  );
}

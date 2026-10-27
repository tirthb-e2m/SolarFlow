import {
  assumptionBasis,
  demoDisclaimer,
  modelLimits,
  readingLines,
  type PlantResult,
  type ScenarioDefinition,
} from "@/lib/analytics";

type AssumptionsPanelProps = {
  scenario: ScenarioDefinition;
  result: PlantResult;
};

export function AssumptionsPanel({ scenario, result }: AssumptionsPanelProps) {
  const lines = readingLines(result);

  return (
    <div className="mt-12 grid gap-12 border-t border-white/10 pt-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <h3 className="font-display text-[1.7rem] leading-none tracking-[-0.03em] text-paper">
          How the cards are calculated
        </h3>
        <ol className="mt-6 flex flex-col gap-5">
          {lines.map((line, index) => (
            <li key={line.id} className="grid grid-cols-[auto_1fr] gap-4">
              <span className="font-sans text-[0.68rem] font-medium tracking-[0.16em] text-cyan">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block font-display text-xl tracking-[-0.03em] text-paper">
                  {line.label}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-paper/60">{line.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <ul className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6">
          {scenario.notes.map((note) => (
            <li key={note} className="text-sm leading-relaxed text-paper/60">
              {note}
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-5">
        <h3 className="font-display text-[1.7rem] leading-none tracking-[-0.03em] text-paper">
          Demo, not a measurement
        </h3>
        <p className="mt-5 text-sm leading-relaxed text-paper/70">{assumptionBasis}</p>
        <ul className="mt-5 flex flex-col gap-3">
          {modelLimits.map((limit) => (
            <li key={limit} className="text-sm leading-relaxed text-mute">
              {limit}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-relaxed text-paper/70">{demoDisclaimer}</p>
      </div>
    </div>
  );
}

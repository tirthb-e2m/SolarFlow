"use client";

import { scenarioList, type ScenarioId } from "@/lib/analytics";
import { cx } from "@/lib/cx";

type ScenarioPickerProps = {
  activeId: ScenarioId;
  onSelect: (id: ScenarioId) => void;
};

export function ScenarioPicker({ activeId, onSelect }: ScenarioPickerProps) {
  return (
    <div>
      <p className="font-sans text-[0.68rem] font-medium tracking-[0.22em] text-mute uppercase">
        Illustrative scenarios
      </p>
      <div role="radiogroup" aria-label="Solar scenario" className="mt-4 grid gap-3 md:grid-cols-3">
        {scenarioList.map((scenario) => {
          const active = scenario.id === activeId;
          return (
            <label
              key={scenario.id}
              className={cx(
                "relative block cursor-pointer border px-4 py-5 transition-colors duration-300",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-cyan",
                active
                  ? "border-cyan/80 bg-[linear-gradient(180deg,rgba(255,106,26,0.16),transparent_48%)]"
                  : "border-white/10 hover:border-white/30",
              )}
            >
              <input
                type="radio"
                name="solar-scenario"
                value={scenario.id}
                checked={active}
                onChange={() => onSelect(scenario.id)}
                className="sr-only focus-visible:outline-none"
              />
              <span className="font-sans text-[0.68rem] font-medium tracking-[0.2em] text-cyan uppercase">
                {scenario.kicker}
              </span>
              <span className="mt-3 block font-display text-[1.7rem] leading-none tracking-[-0.03em] text-paper">
                {scenario.name}
              </span>
              <span className="mt-3 block text-sm leading-relaxed text-mute">
                {scenario.blurb}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

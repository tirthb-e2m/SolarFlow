type ScrollCueProps = {
  label: string;
};

export function ScrollCue({ label }: ScrollCueProps) {
  return (
    <div data-rise className="flex items-center gap-4">
      <span aria-hidden="true" className="relative block h-14 w-px bg-white/20">
        <span
          data-scroll-tick
          className="absolute inset-x-0 top-0 h-3.5 bg-solar will-change-transform"
        />
      </span>
      <span className="font-sans text-[0.72rem] font-medium tracking-[0.28em] text-paper/70 uppercase">
        {label}
      </span>
    </div>
  );
}

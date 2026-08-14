const BAR_COUNT = 24;

export function VuMeter({
  level,
  label,
}: {
  level: number;
  label: string;
}) {
  const active = Math.round((Math.min(100, Math.max(0, level)) / 100) * BAR_COUNT);
  return (
    <div className="space-y-3">
      <p className="font-[family-name:var(--font-fraunces)] text-xl font-semibold">
        {label}
      </p>
      <div
        className="sss-well flex h-20 items-end gap-1 px-2 py-2"
        aria-label={`Signal level ${level} percent`}
      >
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <div
            key={i}
            className={`min-h-2 flex-1 ${
              i < active ? "bg-sss-accent" : "bg-sss-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

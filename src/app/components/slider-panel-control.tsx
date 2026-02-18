import { TOOL_SLIDER_CLASS } from "../../const";

type SliderPanelControlProps = {
  label: string;
  max: number;
  maxLabel: string;
  min: number;
  minLabel: string;
  onChange: (nextValue: number) => void;
  step?: number;
  value: number;
  valueText: string;
};

export function SliderPanelControl({
  label,
  max,
  maxLabel,
  min,
  minLabel,
  onChange,
  step = 1,
  value,
  valueText,
}: SliderPanelControlProps) {
  const percent = toRangePercent(value, min, max);

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-[#9ca9bb]">{label}</span>
        <span className="rounded border border-[#2f5c80] bg-[#0d99ff]/20 px-1.5 py-0.5 text-[11px] font-semibold text-[#9fd7ff]">
          {valueText}
        </span>
      </div>
      <div className="mb-1 rounded-md border border-[#263348] bg-[#0f1724] px-2 py-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            onChange(Number(event.target.value));
          }}
          style={{
            background: `linear-gradient(90deg, #0d99ff 0%, #0d99ff ${percent}%, #1a2638 ${percent}%, #1a2638 100%)`,
          }}
          className={TOOL_SLIDER_CLASS}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-[#73839a]">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </>
  );
}

function toRangePercent(value: number, min: number, max: number) {
  if (max <= min) return 0;
  const clamped = Math.min(max, Math.max(min, value));
  return ((clamped - min) / (max - min)) * 100;
}

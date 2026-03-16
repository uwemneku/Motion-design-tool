/** Slider Panel Control.Tsx reusable UI component. */
import { TOOL_SLIDER_CLASS } from "../../const";

type SliderPanelControlProps = {
  classNames?: {
    label?: string;
    rangeLabels?: string;
    shell?: string;
    value?: string;
  };
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

/**
 * Reusable labeled range control used inside dark tooltip panels.
 */
export function SliderPanelControl({
  classNames,
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
        <span className={classNames?.label ?? "font-medium text-[#9ca3af]"}>{label}</span>
        <span
          className={
            classNames?.value ??
            "rounded border border-[#6b7280] bg-[#ffffff]/20 px-1.5 py-0.5 text-[11px] font-semibold text-[#e5e7eb]"
          }
        >
          {valueText}
        </span>
      </div>
      <div
        className={
          classNames?.shell ??
          "mb-1 rounded-md border border-[#4a4a4a] bg-[#2c2c2c] px-2 py-2"
        }
      >
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
            background: `linear-gradient(90deg, #ffffff 0%, #ffffff ${percent}%, #111111 ${percent}%, #111111 100%)`,
          }}
          className={TOOL_SLIDER_CLASS}
        />
      </div>
      <div
        className={
          classNames?.rangeLabels ??
          "flex items-center justify-between text-[10px] uppercase tracking-wide text-[#9ca3af]"
        }
      >
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </>
  );
}

/**
 * Converts a value to a 0-100 percentage for progress-track rendering.
 */
function toRangePercent(value: number, min: number, max: number) {
  if (max <= min) return 0;
  const clamped = Math.min(max, Math.max(min, value));
  return ((clamped - min) / (max - min)) * 100;
}

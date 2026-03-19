/** Alignment control group for the canvas design side panel. */
import { useAppSelector } from "../../../store";
import { HorizontalAlignIcon, VerticalAlignIcon } from "./design-components";
import { HORIZONTAL_ALIGNMENT_CONTROLS, VERTICAL_ALIGNMENT_CONTROLS } from "./design-helpers";
import type { HorizontalAlignment, VerticalAlignment } from "./design-helpers";
import { labelClass } from "./util";

type DesignAlignmentControlsProps = {
  onAlign: (axis: HorizontalAlignment | VerticalAlignment, activeAspectRatio: number) => void;
};

/** Renders the grouped horizontal and vertical alignment controls. */
export default function DesignAlignmentControls({ onAlign }: DesignAlignmentControlsProps) {
  const activeAspectRatio =
    useAppSelector((state) => state.editor.projectInfo.videoAspectRatio) ?? 1;
  return (
    <div className="space-y-1.5">
      <span className={labelClass}>Alignment</span>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid grid-cols-3 overflow-hidden rounded-[4px] border border-white/8 bg-[rgba(255,255,255,0.055)]">
          {HORIZONTAL_ALIGNMENT_CONTROLS.map((control, index) => (
            <button
              key={control.action}
              type="button"
              aria-label={control.label}
              title={control.label}
              className={`grid h-6 max-h-6 place-items-center text-[#f2f4f8] transition hover:bg-white/8 ${
                index < HORIZONTAL_ALIGNMENT_CONTROLS.length - 1 ? "border-r border-white/8" : ""
              }`}
              onClick={() => {
                onAlign(control.action, activeAspectRatio);
              }}
            >
              <HorizontalAlignIcon action={control.action} />
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 overflow-hidden rounded-[4px] border border-white/8 bg-[rgba(255,255,255,0.055)]">
          {VERTICAL_ALIGNMENT_CONTROLS.map((control, index) => (
            <button
              key={control.action}
              type="button"
              aria-label={control.label}
              title={control.label}
              className={`grid h-6 max-h-6 place-items-center text-[#f2f4f8] transition hover:bg-white/8 ${
                index < VERTICAL_ALIGNMENT_CONTROLS.length - 1 ? "border-r border-white/8" : ""
              }`}
              onClick={() => {
                onAlign(control.action, activeAspectRatio);
              }}
            >
              <VerticalAlignIcon action={control.action} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Add Polygon Button.Tsx reusable UI component. */
import * as Tooltip from "@radix-ui/react-tooltip";
import { useState, type MouseEvent } from "react";
import { SliderPanelControl } from "../slider-panel-control";
import { TOOL_BUTTON_CLASS } from "../../../const";

type AddPolygonButtonProps = {
  onAddPolygon: (sides: number) => void;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * Adds a polygon and keeps polygon-sides state local to this control.
 */
export function AddPolygonButton({
  onAddPolygon,
  onMouseDown,
}: AddPolygonButtonProps) {
  const [polygonSides, setPolygonSides] = useState(5);

  return (
    <Tooltip.Root delayDuration={120}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label="Add polygon"
          onClick={() => {
            onAddPolygon(polygonSides);
          }}
          onMouseDown={onMouseDown}
          className={TOOL_BUTTON_CLASS}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3L4 9l3 10h10l3-10-8-6z" />
          </svg>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="bottom"
          sideOffset={8}
          className="z-50 w-56 rounded-lg border border-[#2f3745] bg-[#121923] p-2.5 text-xs text-[#e6e6e6] shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
        >
          <SliderPanelControl
            label="Polygon sides"
            min={3}
            max={12}
            minLabel="Triangle"
            maxLabel="Dodecagon"
            value={polygonSides}
            valueText={String(polygonSides)}
            onChange={setPolygonSides}
          />
          <Tooltip.Arrow className="fill-[#121923]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Color field with a Radix popover picker anchored beside the inspector. */
import * as Popover from "@radix-ui/react-popover";
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { useState } from "react";

import { FieldShell, KeyframeActionButton } from "./design-components";
import { labelClass, normalizeHexColor } from "./util";

type DesignColorFieldProps = {
  fallbackColor?: string;
  inputValue: string;
  isKeyframed: boolean;
  label: string;
  onAddKeyframe: () => void;
  onCommitValue: (value: string) => void;
  onPreviewValue: (value: string) => void;
};

/** Renders one compact color field with a popover picker positioned beside the panel. */
export default function DesignColorField({
  fallbackColor,
  inputValue,
  isKeyframed,
  label,
  onAddKeyframe,
  onCommitValue,
  onPreviewValue,
}: DesignColorFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedColor = normalizeHexColor(inputValue, fallbackColor);

  return (
    <label className={`block ${labelClass}`}>
      <span className="text-[#d5d8e1]">{label}</span>
      <Popover.Root modal={false} open={isOpen} onOpenChange={setIsOpen}>
        <div className="space-y-2">
          <FieldShell className="gap-2 px-2">
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-label={`Open ${label.toLowerCase()} picker`}
                className="size-4 shrink-0 rounded-sm border border-white/12"
                style={{
                  backgroundColor: normalizedColor,
                }}
              />
            </Popover.Trigger>
            <KeyframeActionButton
              isKeyframed={isKeyframed}
              label={label}
              onAddKeyframe={onAddKeyframe}
              className="right-9"
            />
            <HexColorInput
              color={normalizedColor}
              alpha
              prefixed
              onChange={(value) => {
                onPreviewValue(`#${value.replace(/^#/, "")}`);
              }}
              onBlur={() => {
                onCommitValue(normalizedColor);
              }}
              onFocus={() => {
                setIsOpen(true);
              }}
              className="h-full flex-1 bg-transparent pr-10 text-[13px] text-[#f6f7fb] outline-none"
            />
          </FieldShell>
          <Popover.Portal>
            <Popover.Content
              side="left"
              align="center"
              sideOffset={204}
              avoidCollisions={false}
              collisionPadding={16}
              data-testid="design-color-popover"
              className="z-50 w-[240px] rounded-[12px] border border-white/10 bg-[#10131b] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.48)] backdrop-blur-xl"
            >
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d5d8e1]">
                  {label}
                </div>
                <HexAlphaColorPicker
                  color={normalizedColor}
                  onChange={(value) => {
                    onCommitValue(value);
                  }}
                  className="!w-full"
                />
              </div>
            </Popover.Content>
          </Popover.Portal>
        </div>
      </Popover.Root>
    </label>
  );
}

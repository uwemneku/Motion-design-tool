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
      <span className="text-[var(--wise-content-secondary)]">{label}</span>
      <Popover.Root modal={false} open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Anchor asChild>
          <div className="space-y-1.5">
            <FieldShell className="gap-1.5 border border-[rgba(141,171,255,0.14)] px-2">
              <Popover.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Open ${label.toLowerCase()} picker`}
                  className="size-3.5 shrink-0 rounded-[2px] border border-[rgba(141,171,255,0.16)]"
                  style={{
                    backgroundColor: normalizedColor,
                  }}
                />
              </Popover.Trigger>
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
                className="min-w-0 h-full flex-1 bg-transparent font-[var(--wise-font-display)] text-[11px] font-semibold tracking-[-0.015em] text-[var(--wise-content-primary)] outline-none"
              />
              <div className="h-3.5 w-px shrink-0 bg-[rgba(141,171,255,0.14)]" />
              <KeyframeActionButton
                isKeyframed={isKeyframed}
                label={label}
                onAddKeyframe={onAddKeyframe}
                variant="inline"
              />
            </FieldShell>
            <Popover.Portal>
              <Popover.Content
                side="left"
                align="center"
                sideOffset={18}
                avoidCollisions={false}
                collisionPadding={16}
                data-testid="design-color-popover"
                className="z-50 w-[240px] rounded-[6px] border border-[rgba(141,171,255,0.15)] bg-[rgba(25,25,28,0.98)] p-3 shadow-[0_28px_44px_rgba(141,171,255,0.06)] backdrop-blur-xl"
              >
                <div className="space-y-3">
                  <div className="font-[var(--wise-font-display)] text-[11px] font-semibold tracking-[-0.01em] text-[var(--wise-content-primary)]">
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
        </Popover.Anchor>
      </Popover.Root>
    </label>
  );
}

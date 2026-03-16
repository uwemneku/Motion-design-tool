/** Styled Radix dropdown-menu select used for compact app controls. */
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

type RadixMenuSelectOption = {
  label: string;
  value: string;
};

type RadixMenuSelectProps = {
  ariaLabel: string;
  contentClassName?: string;
  options: RadixMenuSelectOption[];
  side?: "bottom" | "left" | "right" | "top";
  triggerClassName?: string;
  value: string;
  onValueChange: (value: string) => void;
};

/** Renders a compact trigger plus styled dropdown radio menu. */
export function RadixMenuSelect({
  ariaLabel,
  contentClassName,
  options,
  side = "bottom",
  triggerClassName,
  value,
  onValueChange,
}: RadixMenuSelectProps) {
  const activeOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={
            triggerClassName ??
            "inline-flex items-center gap-2 rounded-[5px] border border-white/10 bg-white/5 px-2.5 py-1.5 font-[var(--wise-font-ui)] text-[11px] text-white"
          }
        >
          <span>{activeOption?.label ?? value}</span>
          <ChevronDown className="size-3.5 opacity-80" strokeWidth={1.9} aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={side}
          sideOffset={8}
          align="end"
          className={
            contentClassName ??
            "z-50 min-w-[160px] rounded-[8px] border border-white/10 bg-[rgba(35,35,37,0.98)] p-1 shadow-[0_16px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          }
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className="flex h-8 cursor-default items-center justify-between rounded-[5px] px-2.5 font-[var(--wise-font-ui)] text-[11px] font-medium text-white outline-none transition data-[highlighted]:bg-white/8"
              >
                <span>{option.label}</span>
                <DropdownMenu.ItemIndicator>
                  <Check className="size-3.5" strokeWidth={2} aria-hidden />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Spinner Status Row.Tsx reusable UI component. */
import { ReloadIcon } from '@radix-ui/react-icons';

type SpinnerStatusRowProps = {
  text: string;
};

/** Inline spinner row for short loading/status messages. */
export function SpinnerStatusRow({ text }: SpinnerStatusRowProps) {
  return (
    <div className='inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs text-[#9fd7ff]'>
      <ReloadIcon className='size-3.5 animate-spin' />
      <span>{text}</span>
    </div>
  );
}

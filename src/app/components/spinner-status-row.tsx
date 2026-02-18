import { ReloadIcon } from '@radix-ui/react-icons';

type SpinnerStatusRowProps = {
  text: string;
};

export function SpinnerStatusRow({ text }: SpinnerStatusRowProps) {
  return (
    <div className='inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs text-[#c8d8ff]'>
      <ReloadIcon className='size-3.5 animate-spin' />
      <span>{text}</span>
    </div>
  );
}

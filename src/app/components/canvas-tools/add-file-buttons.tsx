import { useRef, type ChangeEvent, type MouseEvent } from 'react';
import { ToolButton } from './tool-button';

type ButtonMouseDown = (event: MouseEvent<HTMLButtonElement>) => void;

type AddFileButtonsProps = {
  onAddImageFile: (file: File) => void | Promise<void>;
  onAddSvgFile: (file: File) => void | Promise<void>;
  onMouseDown: ButtonMouseDown;
};

export function AddImageButton({
  onAddImageFile,
  onMouseDown,
}: Pick<AddFileButtonsProps, 'onAddImageFile' | 'onMouseDown'>) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const onImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void onAddImageFile(file);
    event.target.value = '';
  };

  return (
    <>
      <ToolButton
        label='Add image'
        onClick={() => {
          imageInputRef.current?.click();
        }}
        onMouseDown={onMouseDown}
      >
        <svg
          viewBox='0 0 24 24'
          className='size-4'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <rect x='3' y='5' width='18' height='14' rx='2' />
          <circle cx='9' cy='10' r='1.5' />
          <path d='M5 17l5-5 3 3 3-2 3 4' />
        </svg>
      </ToolButton>
      <input
        ref={imageInputRef}
        type='file'
        accept='image/*'
        onChange={onImageSelected}
        className='hidden'
      />
    </>
  );
}

export function AddSvgButton({
  onAddSvgFile,
  onMouseDown,
}: Pick<AddFileButtonsProps, 'onAddSvgFile' | 'onMouseDown'>) {
  const svgInputRef = useRef<HTMLInputElement | null>(null);

  const onSvgSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void onAddSvgFile(file);
    event.target.value = '';
  };

  return (
    <>
      <ToolButton
        label='Add SVG'
        onClick={() => {
          svgInputRef.current?.click();
        }}
        onMouseDown={onMouseDown}
      >
        <svg
          viewBox='0 0 24 24'
          className='size-4'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <path d='M4 4h10l6 6v10H4z' />
          <path d='M14 4v6h6' />
          <path d='M8 15l2.5-3 2 2.5 1.5-2 2 2.5' />
        </svg>
      </ToolButton>
      <input
        ref={svgInputRef}
        type='file'
        accept='.svg,image/svg+xml'
        onChange={onSvgSelected}
        className='hidden'
      />
    </>
  );
}

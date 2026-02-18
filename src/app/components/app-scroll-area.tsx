import * as ScrollArea from '@radix-ui/react-scroll-area';
import type { ReactNode } from 'react';

type AppScrollAreaProps = {
  children: ReactNode;
  cornerClassName?: string;
  horizontalScrollbarClassName?: string;
  rootClassName?: string;
  showCorner?: boolean;
  showHorizontalScrollbar?: boolean;
  showVerticalScrollbar?: boolean;
  thumbClassName?: string;
  verticalScrollbarClassName?: string;
  viewportClassName?: string;
};

const DEFAULT_THUMB_CLASS_NAME =
  'relative flex-1 rounded-full bg-[var(--wise-surface-muted)]';

export function AppScrollArea({
  children,
  cornerClassName,
  horizontalScrollbarClassName,
  rootClassName,
  showCorner = false,
  showHorizontalScrollbar = false,
  showVerticalScrollbar = true,
  thumbClassName = DEFAULT_THUMB_CLASS_NAME,
  verticalScrollbarClassName,
  viewportClassName,
}: AppScrollAreaProps) {
  return (
    <ScrollArea.Root className={rootClassName}>
      <ScrollArea.Viewport className={viewportClassName}>
        {children}
      </ScrollArea.Viewport>

      {showHorizontalScrollbar ? (
        <ScrollArea.Scrollbar
          orientation='horizontal'
          className={horizontalScrollbarClassName}
        >
          <ScrollArea.Thumb className={thumbClassName} />
        </ScrollArea.Scrollbar>
      ) : null}

      {showVerticalScrollbar ? (
        <ScrollArea.Scrollbar
          orientation='vertical'
          className={verticalScrollbarClassName}
        >
          <ScrollArea.Thumb className={thumbClassName} />
        </ScrollArea.Scrollbar>
      ) : null}

      {showCorner ? <ScrollArea.Corner className={cornerClassName} /> : null}
    </ScrollArea.Root>
  );
}

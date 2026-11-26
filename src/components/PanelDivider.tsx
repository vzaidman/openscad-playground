import { useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export const minimumPanelPercent = 12;

interface SidePanelProps {
  children: ReactNode;
  multi: boolean;
  visible: boolean;
  resizable: boolean;
  layoutKey: string;
  initialWidth: number;
  maxWidth: number;
  onResize: (percent: number) => void;
}

export function DividerAfter(props: SidePanelProps) {
  return <SidePanel {...props} edge="right" label="Resize editor" />;
}

export function DividerBefore(props: SidePanelProps) {
  return <SidePanel {...props} edge="left" label="Resize customizer" />;
}

function SidePanel({ children, multi, visible, resizable, layoutKey, initialWidth, maxWidth, onResize, edge, label }:
  SidePanelProps & { edge: 'left' | 'right'; label: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [resizedWidths, setResizedWidths] = useState<Record<string, number>>({});
  const width = resizedWidths[layoutKey] ?? initialWidth;
  function resize(percent: number) {
    setResizedWidths(previous => ({ ...previous, [layoutKey]: percent }));
    onResize(percent);
  }
  const saveNativeWidth = useEffectEvent((panel: HTMLDivElement) => {
    if (!resizable || !panel.style.width.endsWith('px')) return;
    const rowWidth = panel.parentElement!.getBoundingClientRect().width;
    if (!rowWidth) return;
    const percent = Math.max(minimumPanelPercent, Math.min(maxWidth,
      panel.getBoundingClientRect().width * 100 / rowWidth));
    panel.style.width = percent + '%';
    resize(percent);
  });
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      // Chromium writes a pixel width during a native drag. Restore the percentage
      // after resize notifications finish to avoid another layout in the same cycle.
      if (!frame && panel.style.width.endsWith('px')) frame = requestAnimationFrame(() => {
        frame = 0;
        saveNativeWidth(panel);
      });
    });
    observer.observe(panel, { box: 'border-box' });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  let style: CSSProperties = { display: 'contents' };
  if (multi) {
    style = {
      display: visible ? 'flex' : 'none', flexDirection: 'column',
      flex: resizable ? '0 0 auto' : '1 1 0px',
      minWidth: resizable ? minimumPanelPercent + '%' : 0,
      maxWidth: resizable ? maxWidth + '%' : undefined,
      width: resizable ? width + '%' : undefined,
    };
  }

  return (
    <div ref={panelRef} style={style}
      className={resizable ? `native-resizable-panel resize-edge-${edge}` : undefined}>
      {children}
      {resizable && <span className="panel-grip-focus" role="separator" tabIndex={0}
        aria-label={label} aria-orientation="vertical" aria-valuenow={Math.round(width)}
        aria-valuemin={minimumPanelPercent} aria-valuemax={Math.round(maxWidth)}
        aria-valuetext={`${Math.round(width)}% wide`}
        onKeyDown={event => {
          const step = edge === 'right' ? 2 : -2;
          let next: number;
          switch (event.key) {
            case 'ArrowLeft': next = width - step; break;
            case 'ArrowRight': next = width + step; break;
            case 'Home': next = minimumPanelPercent; break;
            case 'End': next = maxWidth; break;
            default: return;
          }
          event.preventDefault();
          resize(Math.max(minimumPanelPercent, Math.min(maxWidth, next)));
        }}
      />}
    </div>
  );
}

// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import React, { CSSProperties, useContext, useMemo, useState } from 'react';
import { MultiLayoutComponentId } from '../state/app-state';
import EditorPanel from './EditorPanel';
import ViewerPanel, { ViewerPanelHandle } from './ViewerPanel';
import Footer from './Footer';
import { ModelContext } from './contexts';
import PanelSwitcher from './PanelSwitcher';
import { DividerAfter, DividerBefore, minimumPanelPercent } from './PanelDivider';
import { loadLocal, saveLocal } from '../state/mcp-viewstate';
import { ConfirmDialog } from 'primereact/confirmdialog';
import CustomizerPanel from './CustomizerPanel';
import WasmStatusBanner from './WasmStatusBanner';

const panelOrder: MultiLayoutComponentId[] = ['editor', 'viewer', 'customizer'];

/** The full UI: tab bar, editor / viewer / customizer panels and footer. */
export default function FullLayout({viewerRef}: {viewerRef?: React.Ref<ViewerPanelHandle>}) {
  const model = useContext(ModelContext);
  if (!model) throw new Error('No model');
  const state = model.state;

  const zIndexOfPanelsDependingOnFocus = {
    editor: {
      editor: 3,
      viewer: 1,
      customizer: 0,
    },
    viewer: {
      editor: 2,
      viewer: 3,
      customizer: 1,
    },
    customizer: {
      editor: 0,
      viewer: 1,
      customizer: 3,
    }
  }

  const layout = state.view.layout;
  const mode = layout.mode;
  const visible = panelOrder.filter(id => layout.mode === 'multi' && layout[id]);
  const layoutKey = visible.join('-');
  const [sizesByLayout, setSizesByLayout] = useState<Record<string, number[]>>({});
  const count = visible.length;
  const storageKey = 'openscad-playground.panel-widths.v1.' + layoutKey;
  const savedWidths = useMemo(() => {
    const fallback = Array<number>(count).fill(100 / (count || 1));
    if (count < 2) return fallback;
    try {
      const sizes = JSON.parse(loadLocal(storageKey) ?? 'null');
      if (Array.isArray(sizes) && sizes.length === count &&
          sizes.every(size => Number.isFinite(size) && size >= minimumPanelPercent - 1e-8) &&
          Math.abs(sizes.reduce((sum, size) => sum + size, 0) - 100) < 1e-6) return sizes as number[];
    } catch { /* A malformed preference falls back to equal widths. */ }
    return fallback;
  }, [storageKey, count]);
  const widths = sizesByLayout[layoutKey] ?? savedWidths;

  // The viewer takes the remaining space. With only the two side panels open,
  // the customizer fills the space left by resizing the editor.
  const fillPanel = visible.includes('viewer') ? 'viewer' : visible.at(-1);
  function sidePanelProps(id: 'editor' | 'customizer') {
    const index = visible.indexOf(id);
    const fillIndex = fillPanel ? visible.indexOf(fillPanel) : -1;
    const width = widths[index] ?? 100;
    const pairWidth = width + (widths[fillIndex] ?? 0);
    return {
      multi: mode === 'multi', visible: index >= 0, resizable: count > 1 && index >= 0 && id !== fillPanel,
      layoutKey, initialWidth: savedWidths[index] ?? 100, maxWidth: pairWidth - minimumPanelPercent,
      onResize: (percent: number) => {
        const next = widths.slice();
        next[index] = percent;
        next[fillIndex] = pairWidth - percent;
        setSizesByLayout(previous => ({ ...previous, [layoutKey]: next }));
        saveLocal(storageKey, JSON.stringify(next));
      },
    };
  }

  function getPanelStyle(id: MultiLayoutComponentId): CSSProperties {
    if (layout.mode === 'multi') {
      return {
        flex: '1 1 0px',
        minWidth: 0,
        display: layout[id] ? 'flex' : 'none',
      }
    } else {
      return {
        flex: 1,
        zIndex: Number((zIndexOfPanelsDependingOnFocus as any)[id][layout.focus]),
      }
    }
  }

  return (
    <div className='flex flex-column' style={{
        flex: 1,
      }}>
      
      <PanelSwitcher />

      <WasmStatusBanner />

      <div className={mode === 'multi' ? 'flex flex-row' : 'flex flex-column'}
          style={mode === 'multi' ? {flex: 1} : {
            flex: 1,
            position: 'relative'
          }}>

        <DividerAfter {...sidePanelProps('editor')}>
          <EditorPanel className={`
          opacity-animated
          ${layout.mode === 'single' && layout.focus !== 'editor' ? 'opacity-0' : ''}
          ${layout.mode === 'single' ? 'absolute-fill' : ''}
        `} style={getPanelStyle('editor')} />
        </DividerAfter>
        <ViewerPanel ref={viewerRef} className={layout.mode === 'single' ? `absolute-fill` : ''} style={getPanelStyle('viewer')} />
        <DividerBefore {...sidePanelProps('customizer')}>
          <CustomizerPanel className={`
          opacity-animated
          ${layout.mode === 'single' && layout.focus !== 'customizer' ? 'opacity-0' : ''}
          ${layout.mode === 'single' ? `absolute-fill` : ''}
        `} style={getPanelStyle('customizer')} />
        </DividerBefore>
      </div>

      <Footer />
      <ConfirmDialog />
    </div>
  );
}

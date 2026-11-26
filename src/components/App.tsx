// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import React, { useEffect, useRef, useState } from 'react';
import {State, StatePersister} from '../state/app-state'
import { Model } from '../state/model';
import FullLayout from './FullLayout';
import EmbedView from './EmbedView';
import { ModelContext, FSContext } from './contexts';
import { fullAppUrl, isFramed } from '../state/embed';
import { useFullscreenApi } from './use-fullscreen';
import { useEmbedClass } from './use-embed-class';
import { EmbedIcons } from './EmbedView';
import { startBackgroundLoading } from '../background-loading';
import { downloadSource, downloadUrl } from '../utils';
import { buildFilename, type ExportFormat } from '../state/export-logic';
import type { ViewerPanelHandle } from './ViewerPanel';
import { selectedCameraPreset } from '../state/camera-presets.ts';
import { presetOrbit, type ResolvedCamera } from '../state/mcp-tools-logic.ts';

export function App({initialState, statePersister, fs}: {initialState: State, statePersister: StatePersister, fs: FS}) {
  const [state, setState] = useState(initialState);
  const viewerRef = useRef<ViewerPanelHandle>(null);
  const preset = selectedCameraPreset(state.parameterSet, state.params.vars);
  const renderCamera = state.output?.camera;
  const displayURL = state.output?.displayFileURL;
  useEffect(() => {
    const viewer = viewerRef.current;
    const camera: ResolvedCamera | undefined = renderCamera ?? (preset
      ? { ...presetOrbit(preset), zoom: 1, target: 'auto', fov: 'auto' } : undefined);
    if (!displayURL || !viewer || !camera) return;
    let cancelled = false;
    void viewer.waitForModel(20_000).then(ready => {
      if (ready && !cancelled) return viewer.setCamera(camera);
    }).catch(error => console.warn('Could not apply the selected camera preset', error));
    return () => { cancelled = true; };
  }, [preset, renderCamera, displayURL, state.view.embed]);
  
  const model = new Model(fs, state, setState, statePersister);
  useEffect(() => model.init());

  // Only needed by the file picker, completions, offline use...: once the first render
  // is out of the way (never while it is in progress, however long it takes). With
  // nothing to render, there is no first render to wait for.
  const activeSource = state.params.sources.find(s => s.path === state.params.activePath);
  const nothingToRender = activeSource?.content != null && activeSource.content.trim() === '';
  const firstRenderSettled = state.output != null || state.error != null || nothingToRender;
  useEffect(() => {
    if (firstRenderSettled) {
      startBackgroundLoading();
    }
  }, [firstRenderSettled]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5') {
        event.preventDefault();
        model.render({isPreview: true, now: true})
      } else if (event.key === 'F6') {
        event.preventDefault();
        model.render({isPreview: false, now: true})
      } else if (event.key === 'F7') {
        event.preventDefault();
        model.export();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEmbedClass(state.view.embed);
  const fullscreen = useFullscreenApi();
  // Plain browser download (works at top level; a sandboxed frame may block it).
  const onDownload = async (format: ExportFormat) => {
    if (model.state.output?.isPreview) await model.render({isPreview: false, now: true});
    const file = await model.exportFile(format);
    const stem = (model.state.params.activePath.split('/').pop() ?? 'model').replace(/\.[^.]+$/, '');
    const name = buildFilename(undefined, stem, format);
    const url = URL.createObjectURL(file);
    downloadUrl(url, name);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return {message: `Downloaded ${name}`};
  };

  const onDownloadSource = async () =>
    ({message: `Downloaded ${downloadSource(model.state.params.sources, model.state.params.activePath)}`});

  const isDark = false; // the web app has a light theme

  return (
    <ModelContext.Provider value={model}>
      <FSContext.Provider value={fs}>
        {state.view.embed
          ? <EmbedView
              viewerRef={viewerRef}
              isDark={isDark}
              fullscreen={fullscreen}
              onDownload={onDownload}
              onDownloadSource={onDownloadSource}
              // Framed: open the same state as the full app in a new tab (the embedder wants the iframe to stay
              // compact). Top-level: switch in place.
              exit={isFramed()
                ? { label: 'Open full app in a new tab', icon: EmbedIcons.externalLink, href: () => fullAppUrl(window.location.href) }
                : { label: 'Exit embed mode (full app)', icon: EmbedIcons.layout, onClick: () => model.mutate(s => { s.view.embed = false; s.view.customizerOverlay = false; }) }} />
          : <FullLayout viewerRef={viewerRef} />}
      </FSContext.Provider>
    </ModelContext.Provider>
  );
}

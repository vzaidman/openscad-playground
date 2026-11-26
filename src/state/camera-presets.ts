import type { State } from './app-state.ts';
import type { ParameterSet } from './customizer-types.ts';
import { CAMERA_PRESET_NAMES, canonicalPreset, type CameraPresetName, type ResolvedCamera } from './mcp-tools-logic.ts';

/** SCAD can emit echo(playground_camera = [eye, target, fov_degrees]) in exported model coordinates. */
export function cameraFromRender(log: string): ResolvedCamera | undefined {
  const record = /^ECHO: playground_camera = (.+)$/m.exec(log);
  if (!record) return;
  let pose: unknown;
  try { pose = JSON.parse(record[1]); } catch { return; }
  if (!Array.isArray(pose) || pose.length !== 3) return;
  const [eye, target, fov] = pose;
  const vector = (v: unknown): v is [number, number, number] =>
    Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
  if (!vector(eye) || !vector(target) || !Number.isFinite(fov) || fov < 10 || fov > 120) return;
  const dx = eye[0] - target[0], dy = eye[1] - target[1], dz = eye[2] - target[2];
  const distance = Math.hypot(dx, dy, dz);
  if (!distance || !Number.isFinite(distance)) return;
  // The viewer displays OpenSCAD's (x, y, z) as (x, z, -y).
  return { theta: Math.atan2(dx, -dy), phi: Math.atan2(Math.hypot(dx, dy), dz), distance,
    target: { x: target[0], y: target[2], z: -target[1] }, fov };
}

/** A string Customizer parameter named `camera_preset` in the Camera group can select a viewer preset. */
export function selectedCameraPreset(parameters: ParameterSet | undefined, overrides: State['params']['vars']): CameraPresetName | undefined {
  const selector = parameters?.parameters.find(p => p.group === 'Camera' && p.name === 'camera_preset' && p.type === 'string');
  if (!selector) return;
  const value = overrides?.[selector.name] ?? selector.initial;
  const preset = typeof value === 'string' ? canonicalPreset(value) : undefined;
  if (preset && CAMERA_PRESET_NAMES.includes(preset)) {
    return preset;
  }
}

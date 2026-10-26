export type Device = "desktop" | "tablet" | "mobile";
export type ViewportSize = { width: number; height: number };
export const viewportPresets: Record<Device, ViewportSize> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};
export const viewportLimits = {
  width: { min: 320, max: 2560 },
  height: { min: 240, max: 1600 },
};
type ViewportState = { device: Device; sizes: Record<Device, ViewportSize> };
type ViewportAction =
  | { type: "select"; device: Device }
  | { type: "resize"; size: Partial<ViewportSize> }
  | { type: "reset" };

export function createViewportState(): ViewportState {
  return {
    device: "desktop",
    sizes: {
      desktop: { ...viewportPresets.desktop },
      tablet: { ...viewportPresets.tablet },
      mobile: { ...viewportPresets.mobile },
    },
  };
}
export function constrainDimension(value: number, axis: keyof ViewportSize, fallback: number) {
  const { min, max } = viewportLimits[axis];
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}
export function viewportReducer(state: ViewportState, action: ViewportAction): ViewportState {
  if (action.type === "select") return { ...state, device: action.device };
  const current = state.sizes[state.device];
  const size = action.type === "reset" ? { ...viewportPresets[state.device] } : {
    width: constrainDimension(action.size.width ?? current.width, "width", current.width),
    height: constrainDimension(action.size.height ?? current.height, "height", current.height),
  };
  return { ...state, sizes: { ...state.sizes, [state.device]: size } };
}

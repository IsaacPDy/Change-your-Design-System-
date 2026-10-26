import { test } from "node:test";
import assert from "node:assert/strict";
import { createViewportState, viewportReducer } from "../lib/reframe/viewport.ts";

test("device switching keeps custom sizes and reset restores only the selected preset", () => {
  let state = createViewportState();
  assert.deepEqual(state.sizes.desktop, { width: 1440, height: 900 });
  state = viewportReducer(state, { type: "resize", size: { width: 1280, height: 720 } });
  state = viewportReducer(state, { type: "select", device: "mobile" });
  assert.deepEqual(state.sizes.mobile, { width: 390, height: 844 });
  state = viewportReducer(state, { type: "resize", size: { width: 430 } });
  state = viewportReducer(state, { type: "select", device: "desktop" });
  assert.deepEqual(state.sizes.desktop, { width: 1280, height: 720 });
  state = viewportReducer(state, { type: "reset" });
  assert.deepEqual(state.sizes.desktop, { width: 1440, height: 900 });
  assert.deepEqual(state.sizes.mobile, { width: 430, height: 844 });
  assert.deepEqual(createViewportState().sizes.mobile, { width: 390, height: 844 });
});

test("resizing bounds dimensions, rounds fractions, and ignores invalid numbers", () => {
  const initial = createViewportState();
  const bounded = viewportReducer(initial, { type: "resize", size: { width: 100, height: 9999 } });
  assert.deepEqual(bounded.sizes.desktop, { width: 320, height: 1600 });
  const rounded = viewportReducer(bounded, { type: "resize", size: { width: 1024.6, height: NaN } });
  assert.deepEqual(rounded.sizes.desktop, { width: 1025, height: 1600 });
  const invalid = viewportReducer(rounded, { type: "resize", size: { width: Infinity, height: -1 } });
  assert.deepEqual(invalid.sizes.desktop, { width: 1025, height: 240 });
  assert.deepEqual(initial.sizes.desktop, { width: 1440, height: 900 });
});

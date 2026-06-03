// Shared module-level state — written by MobileControls.tsx (HTML overlay),
// read by Camera.tsx and Player.tsx (R3F canvas). No React, no re-renders.
export const mobileInput = {
  jx: 0, // joystick X:  -1 = left,    +1 = right
  jy: 0, // joystick Y:  -1 = forward,  +1 = backward
  ldx: 0, // look delta X (pixels); consumed & zeroed by Camera each frame
  ldy: 0, // look delta Y (pixels); consumed & zeroed by Camera each frame
};

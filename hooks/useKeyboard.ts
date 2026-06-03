const pressedKeys = new Set<string>();

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      pressedKeys.add(e.code);
    }
  });
  window.addEventListener('keyup', (e) => {
    pressedKeys.delete(e.code);
  });
  // Clear all keys on blur (tab switch, pointer lock exit, etc.)
  window.addEventListener('blur', () => {
    pressedKeys.clear();
  });
}

export const isKeyPressed = (code: string): boolean => {
  return pressedKeys.has(code);
};

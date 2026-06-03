import { useEffect, useState } from 'react';

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isMobile;
};

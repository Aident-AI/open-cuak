import { useEffect } from 'react';

export interface CytoscapePanningProps {
  handleZoom: (event: WheelEvent) => void;
}

export function useCytoscapePanning(handleZoom: (event: WheelEvent) => void) {
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      handleZoom(event);
    };

    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, [handleZoom]);
}

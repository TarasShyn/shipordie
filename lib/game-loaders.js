import dynamic from 'next/dynamic';

export const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), { ssr: false });
export const ShipPreview = dynamic(() => import('@/components/game/ShipPreview'), { ssr: false });

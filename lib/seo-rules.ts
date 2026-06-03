import { Routes } from './routes';

export const NON_INDEXABLE_PATHS = [Routes.NotFound, Routes.Embed] as const;

export const NON_INDEXABLE_SEGMENTS: Set<string> = new Set(
  [...NON_INDEXABLE_PATHS].map((p) => p.replace(/^\/+/, '').split('/')[0] ?? '').filter((p) => p.length > 0)
);

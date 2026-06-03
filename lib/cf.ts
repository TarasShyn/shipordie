import { getCloudflareContext } from '@opennextjs/cloudflare';

// The subset of the Cloudflare KV API the live-posts store uses. Typed locally so
// we don't pull in the whole @cloudflare/workers-types global into the app's
// restricted `types` list.
export interface KvStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

// Returns the `KV` namespace binding, or null when it isn't wired (e.g. a plain
// `next dev` without the OpenNext dev proxy). Never throws — callers fall back to
// the bundled demo posts.
export const getKvStore = async (): Promise<KvStore | null> => {
  try {
    const { env } = await getCloudflareContext({ async: true });

    return (env as unknown as { KV?: KvStore }).KV ?? null;
  } catch {
    return null;
  }
};

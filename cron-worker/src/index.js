// Dedicated cron Worker: OpenNext's main worker only handles `fetch`, so it can't
// act on a Cloudflare cron trigger. This tiny worker carries the hourly schedule
// and simply calls the main app's sync endpoint with the shared secret.
const SYNC_URL = 'https://shipordie.tarasshynkarenko.com/api/cron/sync-posts';

export default {
  async scheduled(event, env, ctx) {
    const run = async () => {
      const res = await fetch(SYNC_URL, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
      const body = await res.text();

      console.log(`[shipordie-cron] ${res.status} ${body.slice(0, 200)}`);
    };

    ctx.waitUntil(run());
  },
};

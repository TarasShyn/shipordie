import { getLiveSceneData } from '@/lib/members';

import { EmbedPage } from './embed-page';

// Read KV on every request so a reload always shows the newest synced posts.
export const dynamic = 'force-dynamic';

const Page = async () => {
  const { people } = await getLiveSceneData();

  return <EmbedPage people={people} />;
};

export default Page;

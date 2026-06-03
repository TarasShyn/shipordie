import ShipExperience from '@/components/ship-experience';
import { getLiveExperience } from '@/lib/members';

// Read KV on every request so a reload always shows the newest synced posts.
export const dynamic = 'force-dynamic';

const Home = async () => {
  const { crew, people } = await getLiveExperience();

  return <ShipExperience people={people} crew={crew} />;
};

export default Home;

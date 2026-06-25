import { HomeMatchContent } from '@/components/match-list/HomeMatchContent';
import { PageHeader } from '@/components/match-list/PageHeader';
import { getTodayMatches } from '@/lib/server/matches/service';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const groups = await getTodayMatches();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-44">
      <PageHeader />
      <HomeMatchContent initialGroups={groups} />
    </main>
  );
}

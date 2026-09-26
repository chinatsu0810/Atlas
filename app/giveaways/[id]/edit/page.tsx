import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { getSession } from '@/lib/auth/session';
import { getGiveaway } from '@/lib/giveaways/queries';
import { BackButton } from '@/components/back-button';
import { GiveawayForm } from '@/components/giveaways/giveaway-form';

export const metadata: Metadata = {
  title: '投稿を編集する',
  robots: { index: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function EditGiveawayPage({ params }: Props) {
  const { id } = await params;
  const giveawayId = Number(id);
  if (!Number.isInteger(giveawayId)) notFound();

  const session = await getSession();
  if (!session) redirect(`/sign-in?redirect=/giveaways/${giveawayId}/edit`);

  const data = await getGiveaway(giveawayId);
  if (!data || data.giveaway.authorId !== session.user.id) notFound();

  const { giveaway, images } = data;

  if (giveaway.status !== 'open') {
    redirect(`/giveaways/${giveawayId}`);
  }

  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 py-6 text-[#123B5D] md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <BackButton />
        </div>

        <div className="rounded-2xl border border-[#E1EBF1] bg-white p-5 shadow-sm md:p-8">
          <h1 className="text-xl font-bold">投稿を編集する</h1>
          <p className="mt-1 text-sm text-[#668096]">
            編集できるのは、募集中の間だけです。
          </p>

          <div className="mt-6">
            <GiveawayForm
              giveawayId={giveaway.id}
              initial={{
                title: giveaway.title,
                description: giveaway.description,
                category: giveaway.category,
                country: giveaway.country,
                city: giveaway.city,
                area: giveaway.area ?? '',
                priceAmount: giveaway.priceAmount,
                currency: giveaway.currency,
                availableUntil: giveaway.availableUntil,
                imageUrls: images.map((image) => image.url),
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

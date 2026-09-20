import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import { getMeeting } from '@/lib/ai/management/actions';
import { MeetingNotFoundError } from '@/lib/ai/management/errors';

import { MeetingView } from './meeting-view';

type Props = {
  params: Promise<{ id: string }>;
};

function AccessDenied({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-bold text-gray-900">アクセスできません</h1>

      <p className="mt-3 text-sm text-gray-600">{message}</p>

      <Link
        href="/account"
        className="mt-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        マイページへ戻る
      </Link>
    </main>
  );
}

export default async function MeetingDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return <AccessDenied message="この会議室は運営のみ利用できます。" />;
  }

  const meetingId = Number(id);

  if (!Number.isInteger(meetingId)) {
    return <AccessDenied message="会議が見つかりません。" />;
  }

  try {
    const meeting = await getMeeting(meetingId);

    return (
      <div className="min-h-[calc(100dvh-72px)] bg-gradient-to-b from-[#EFF6FC] via-[#F7FBFD] to-white">
        <MeetingView initialMeeting={meeting} />
      </div>
    );
  } catch (error) {
    if (error instanceof MeetingNotFoundError) {
      return <AccessDenied message="会議が見つかりません。" />;
    }

    throw error;
  }
}

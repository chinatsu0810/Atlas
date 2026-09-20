import { NextRequest, NextResponse } from 'next/server';

import { createMeeting } from '@/lib/ai/management/actions';
import {
  MeetingGenerationError,
  MeetingUnauthorizedError,
  MeetingValidationError,
} from '@/lib/ai/management/errors';

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'リクエストの形式が正しくありません。' },
      { status: 400 }
    );
  }

  try {
    const meeting = await createMeeting(body);
    return NextResponse.json(meeting);
  } catch (error) {
    if (error instanceof MeetingUnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof MeetingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof MeetingGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    console.error('Unexpected error creating meeting:', error);

    return NextResponse.json(
      {
        error:
          '予期しないエラーが発生しました。しばらくしてからもう一度お試しください。',
      },
      { status: 500 }
    );
  }
}

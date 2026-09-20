import { NextRequest, NextResponse } from 'next/server';

import { createSocialWorkflow } from '@/lib/ai/social/actions';
import { SocialWorkflowUnauthorizedError } from '@/lib/ai/social/errors';

import {
  SocialDraftGenerationError,
  SocialDraftValidationError,
} from '@/lib/ai/social/service';

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
    const workflow = await createSocialWorkflow(body);
    return NextResponse.json(workflow);
  } catch (error) {
    if (error instanceof SocialWorkflowUnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof SocialDraftValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof SocialDraftGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    console.error('Unexpected error creating social workflow:', error);

    return NextResponse.json(
      {
        error:
          '予期しないエラーが発生しました。しばらくしてからもう一度お試しください。',
      },
      { status: 500 }
    );
  }
}

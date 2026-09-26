import 'server-only';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  addReaction,
  getReactionSummary,
  reactionTargetExists,
  removeReaction,
} from '@/lib/reactions/service';
import {
  isReactionTypeFor,
  type ReactionTarget,
} from '@/lib/reactions/types';
import { getOrCreateVisitorId, getVisitorId } from '@/lib/reactions/visitor';

type Context = {
  params: Promise<{ id: string }>;
};

const reactionSchema = z.object({
  reactionType: z.string(),
});

const NOT_FOUND_MESSAGES: Record<ReactionTarget, string> = {
  experience: '経験談が見つかりません。',
  question: '質問が見つかりません。',
  answer: '回答が見つかりません。',
};

// /api/{experiences|questions|answers}/[id]/reactions の GET / POST / DELETE。
// GET: 件数取得 / POST: 追加 / DELETE: 取消。いずれも現在の件数を返す。
export function createReactionHandlers(target: ReactionTarget) {
  async function parseTargetId(context: Context) {
    const { id } = await context.params;
    const targetId = Number(id);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return null;
    }

    return (await reactionTargetExists(target, targetId)) ? targetId : null;
  }

  async function parseReactionType(request: Request) {
    const parsed = reactionSchema.safeParse(
      await request.json().catch(() => null)
    );

    return parsed.success &&
      isReactionTypeFor(target, parsed.data.reactionType)
      ? parsed.data.reactionType
      : null;
  }

  function notFound() {
    return NextResponse.json(
      { error: NOT_FOUND_MESSAGES[target] },
      { status: 404 }
    );
  }

  function invalidReactionType() {
    return NextResponse.json(
      { error: 'リアクションの種類が正しくありません。' },
      { status: 400 }
    );
  }

  async function GET(_request: Request, context: Context) {
    const targetId = await parseTargetId(context);

    if (!targetId) {
      return notFound();
    }

    const summary = await getReactionSummary(
      target,
      targetId,
      await getVisitorId()
    );
    return NextResponse.json(summary);
  }

  // 同じリアクションの2回目は何もしない
  async function POST(request: Request, context: Context) {
    const targetId = await parseTargetId(context);

    if (!targetId) {
      return notFound();
    }

    const reactionType = await parseReactionType(request);

    if (!reactionType) {
      return invalidReactionType();
    }

    const visitorId = await getOrCreateVisitorId();
    await addReaction(target, targetId, visitorId, reactionType);

    const summary = await getReactionSummary(target, targetId, visitorId);
    return NextResponse.json(summary);
  }

  // 押していないリアクションなら何もしない
  async function DELETE(request: Request, context: Context) {
    const targetId = await parseTargetId(context);

    if (!targetId) {
      return notFound();
    }

    const reactionType = await parseReactionType(request);

    if (!reactionType) {
      return invalidReactionType();
    }

    const visitorId = await getVisitorId();

    if (visitorId) {
      await removeReaction(target, targetId, visitorId, reactionType);
    }

    const summary = await getReactionSummary(target, targetId, visitorId);
    return NextResponse.json(summary);
  }

  return { GET, POST, DELETE };
}

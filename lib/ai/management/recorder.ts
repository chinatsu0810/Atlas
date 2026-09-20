// Workflow「経営判断会議」（lib/ai/workflows/management-meeting.ts）の記録役。
// 進行の経過（状態・発言）を management_meetings / meeting_messages に保存する。
// Workflowはこのインターフェースだけを知っており、DBの構造には依存しない。

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { managementMeetings, meetingMessages } from '@/lib/db/schema';
import type { MeetingRecorder } from '@/lib/ai/workflows/management-meeting';

export function createMeetingRecorder(meetingId: number): MeetingRecorder {
  return {
    async setStage(stage) {
      await db
        .update(managementMeetings)
        .set({ stage, updatedAt: new Date() })
        .where(eq(managementMeetings.id, meetingId));
    },

    async say({ authorType, employeeId, stage, content }) {
      await db
        .insert(meetingMessages)
        .values({ meetingId, authorType, employeeId, stage, content });
    },
  };
}

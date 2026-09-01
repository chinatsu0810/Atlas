'use server';

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';

import {
  User,
  users,
  teams,
  teamMembers,
  activityLogs,
  type NewUser,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  invitations,
  passwordResetTokens,
} from '@/lib/db/schema';


import {
  comparePasswords,
  hashPassword,
  setSession,
} from '@/lib/auth/session';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';

import {
  validatedAction,
  validatedActionWithUser,
} from '@/lib/auth/middleware';

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }

  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || '',
  };

  await db.insert(activityLogs).values(newActivity);
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
});

export const signIn = validatedAction(
  signInSchema,
  async (data, formData) => {
    const { email, password } = data;

    const userWithTeam = await db
      .select({
        user: users,
        team: teams,
      })
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .leftJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(users.email, email))
      .limit(1);

    if (userWithTeam.length === 0) {
      return {
        error:
          'メールアドレスまたはパスワードが正しくありません。もう一度お試しください。',
        email,
        password,
      };
    }

    const { user: foundUser, team: foundTeam } = userWithTeam[0];

    const isPasswordValid = await comparePasswords(
      password,
      foundUser.passwordHash
    );

    if (!isPasswordValid) {
      return {
        error:
          'メールアドレスまたはパスワードが正しくありません。もう一度お試しください。',
        email,
        password,
      };
    }

    await Promise.all([
      setSession(foundUser),
      logActivity(
        foundTeam?.id,
        foundUser.id,
        ActivityType.SIGN_IN
      ),
    ]);

    const redirectTo = formData.get('redirect') as string | null;

    if (redirectTo === 'checkout') {
      const priceId = formData.get('priceId') as string;
      return createCheckoutSession({
        team: foundTeam,
        priceId,
      });
    }

    redirect('/dashboard');
  }
);

const signUpSchema = z.object({
  name: z
    .string()
    .min(1, 'ニックネームを入力してください')
    .max(100),
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional(),
});

export const signUp = validatedAction(
  signUpSchema,
  async (data, formData) => {
    const { name, email, password, inviteId } = data;

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return {
        error:
          'このメールアドレスはすでに登録されています。ログインしてください。',
        name,
        email,
        password,
      };
    }

    const passwordHash = await hashPassword(password);

    const newUser: NewUser = {
  name,
  email,
  passwordHash,
  role: 'member',
};

    const [createdUser] = await db
      .insert(users)
      .values(newUser)
      .returning();

    if (!createdUser) {
      return {
        error: 'アカウントの作成に失敗しました。もう一度お試しください。',
        name,
        email,
        password,
      };
    }

    let teamId: number;
    let userRole: string;
    let createdTeam: typeof teams.$inferSelect | null = null;

    if (inviteId) {
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.id, parseInt(inviteId)),
            eq(invitations.email, email),
            eq(invitations.status, 'pending')
          )
        )
        .limit(1);

      if (invitation) {
        teamId = invitation.teamId;
        userRole = invitation.role;

        await db
          .update(invitations)
          .set({ status: 'accepted' })
          .where(eq(invitations.id, invitation.id));

        await logActivity(
          teamId,
          createdUser.id,
          ActivityType.ACCEPT_INVITATION
        );

        [createdTeam] = await db
          .select()
          .from(teams)
          .where(eq(teams.id, teamId))
          .limit(1);
      } else {
        return {
          error: '招待リンクが無効または期限切れです。',
          email,
          password,
        };
      }
    } else {
      const newTeam: NewTeam = {
        name: `${email}'s Team`,
      };

      [createdTeam] = await db
        .insert(teams)
        .values(newTeam)
        .returning();

      if (!createdTeam) {
        return {
          error:
            'チームの作成に失敗しました。もう一度お試しください。',
          email,
          password,
        };
      }

      teamId = createdTeam.id;
      userRole = 'owner';

      await logActivity(
        teamId,
        createdUser.id,
        ActivityType.CREATE_TEAM
      );
    }

    const newTeamMember: NewTeamMember = {
      userId: createdUser.id,
      teamId,
      role: userRole,
    };

    await Promise.all([
      db.insert(teamMembers).values(newTeamMember),
      logActivity(
        teamId,
        createdUser.id,
        ActivityType.SIGN_UP
      ),
      setSession(createdUser),
    ]);

    const redirectTo = formData.get('redirect') as string | null;

    if (redirectTo === 'checkout') {
      const priceId = formData.get('priceId') as string;

      return createCheckoutSession({
        team: createdTeam,
        priceId,
      });
    }

    redirect('/dashboard');
  }
);

export async function signOut() {
  const user = (await getUser()) as User;
  const userWithTeam = await getUserWithTeam(user.id);

  await logActivity(
    userWithTeam?.teamId,
    user.id,
    ActivityType.SIGN_OUT
  );

  (await cookies()).delete('session');

  redirect('/');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100),
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = data;

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: '現在のパスワードが正しくありません。',
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error:
          '新しいパスワードは現在のパスワードと異なるものにしてください。',
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error:
          '新しいパスワードと確認用パスワードが一致しません。',
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id)),

      logActivity(
        userWithTeam?.teamId,
        user.id,
        ActivityType.UPDATE_PASSWORD
      ),
    ]);

    return {
      success: 'パスワードを変更しました。',
    };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        password,
        error:
          'パスワードが正しくありません。アカウントを削除できませんでした。',
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    await logActivity(
      userWithTeam?.teamId,
      user.id,
      ActivityType.DELETE_ACCOUNT
    );

    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')`,
      })
      .where(eq(users.id, user.id));

    if (userWithTeam?.teamId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.teamId, userWithTeam.teamId)
          )
        );
    }

    (await cookies()).delete('session');

    redirect('/sign-in');
  }
);

const updateAccountSchema = z.object({
  name: z
    .string()
    .min(1, '名前を入力してください')
    .max(100),
  email: z.string().email('メールアドレスの形式が正しくありません'),
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db
        .update(users)
        .set({ name, email })
        .where(eq(users.id, user.id)),

      logActivity(
        userWithTeam?.teamId,
        user.id,
        ActivityType.UPDATE_ACCOUNT
      ),
    ]);

    return {
      name,
      success: 'アカウント情報を更新しました。',
    };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.number(),
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return {
        error: 'チームに所属していません。',
      };
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER
    );

    return {
      success: 'チームメンバーを削除しました。',
    };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
  role: z.enum(['member', 'owner']),
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return {
        error: 'チームに所属していません。',
      };
    }

    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(
          eq(users.email, email),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      )
      .limit(1);

    if (existingMember.length > 0) {
      return {
        error: 'このユーザーはすでにチームのメンバーです。',
      };
    }

    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return {
        error: 'このメールアドレスにはすでに招待を送信しています。',
      };
    }

    await db.insert(invitations).values({
      teamId: userWithTeam.teamId,
      email,
      role,
      invitedBy: user.id,
      status: 'pending',
    });

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER
    );

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL

    return {
      success: '招待を送信しました。',
    };
  }
);

export async function requestPasswordReset(
  email: string
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      success: false,
      message: 'メールアドレスを入力してください。',
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  // 登録されていないメールでも同じメッセージを返す
  if (!user) {
    return {
      success: true,
      message:
        '登録されているメールアドレスの場合、再設定の案内を送信しました。',
    };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + 60 * 60 * 1000
  );

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  console.log(
    `[Password Reset] http://localhost:3000/reset-password?token=${token}`
  );

  return {
    success: true,
    message:
      '登録されているメールアドレスの場合、再設定の案内を送信しました。',
  };
}
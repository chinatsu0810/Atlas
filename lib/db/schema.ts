import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
  jsonb,
  uuid,
  date,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';


// ============================================================
// Users
// ============================================================

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),

    name: varchar('name', { length: 100 }),

    email: varchar('email', { length: 255 })
      .notNull()
      .unique(),

    passwordHash: text('password_hash').notNull(),

    role: varchar('role', { length: 20 })
      .notNull()
      .default('member'),

    createdAt: timestamp('created_at')
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow(),

    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    activeNameUnique: uniqueIndex('users_name_active_unique')
      .on(table.name)
      .where(sql`${table.deletedAt} IS NULL`),
  })
);

// ============================================================
// Password Reset Tokens
// ============================================================

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: serial('id').primaryKey(),

    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    token: varchar('token', { length: 255 })
      .notNull()
      .unique(),

    expiresAt: timestamp('expires_at').notNull(),

    createdAt: timestamp('created_at')
      .notNull()
      .defaultNow(),
  }
);


// ============================================================
// Teams
// ============================================================

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});


// ============================================================
// Team Members
// ============================================================

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),

  userId: integer('user_id')
    .notNull()
    .references(() => users.id),

  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),

  role: varchar('role', { length: 50 }).notNull(),

  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});


// ============================================================
// Activity Logs
// ============================================================

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),

  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),

  userId: integer('user_id')
    .references(() => users.id),

  action: text('action').notNull(),

  timestamp: timestamp('timestamp')
    .notNull()
    .defaultNow(),

  ipAddress: varchar('ip_address', { length: 45 }),
});


// ============================================================
// Questions
// Atlasの中心となる「質問」
// ============================================================

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),

  title: varchar('title', { length: 200 }).notNull(),

  content: text('content').notNull(),

  country: varchar('country', { length: 100 })
    .notNull(),

  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),

  featuredForAnswer: boolean('featured_for_answer')
    .notNull()
    .default(false),

  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow(),

  deletedAt: timestamp('deleted_at'),
});

// ============================================================
// Tags
// ============================================================

export const tags = pgTable(
  'tags',
  {
    id: serial('id').primaryKey(),

    name: varchar('name', { length: 50 }).notNull(),

    slug: varchar('slug', { length: 50 })
      .notNull()
      .unique(),

    // 'type' = 経験タイプ（駐在員・留学生など）, 'family' = 家族構成, 'theme' = テーマ
    category: varchar('category', { length: 20 })
      .notNull()
      .default('theme'),

    isActive: boolean('is_active')
      .notNull()
      .default(true),

    createdAt: timestamp('created_at')
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // カテゴリごとに「その他」のような同名タグを許容するため、
    // ユニーク制約は name 単体ではなく name + category にする
    nameCategoryUnique: uniqueIndex('tags_name_category_unique').on(
      table.name,
      table.category
    ),
  })
);


// ============================================================
// Question Tags
// ============================================================

export const questionTags = pgTable('question_tags', {
  id: serial('id').primaryKey(),

  questionId: integer('question_id')
    .notNull()
    .references(() => questions.id),

  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id),
});

// ============================================================
// Experience Tags
// ============================================================

export const experienceTags = pgTable('experience_tags', {
  id: serial('id').primaryKey(),

  experienceId: integer('experience_id')
    .notNull()
    .references(() => experiences.id),

  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id),
});

// ============================================================
// Answers
// 質問に対する経験者からの回答
// ============================================================

export const answers = pgTable('answers', {
  id: serial('id').primaryKey(),

  questionId: integer('question_id')
    .notNull()
    .references(() => questions.id),

  content: text('content').notNull(),

  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),

  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow(),

  deletedAt: timestamp('deleted_at'),
});




export const experiences = pgTable('experiences', {
  id: serial('id').primaryKey(),

  title: varchar('title', { length: 200 }).notNull(),

  content: text('content').notNull(),

  country: varchar('country', { length: 100 }).notNull(),

  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),

  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow(),

  deletedAt: timestamp('deleted_at'),
});



// ============================================================
// Invitations
// ============================================================

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),

  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),

  email: varchar('email', { length: 255 }).notNull(),

  role: varchar('role', { length: 50 }).notNull(),

  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),

  invitedAt: timestamp('invited_at')
    .notNull()
    .defaultNow(),

  status: varchar('status', { length: 20 })
    .notNull()
    .default('pending'),
});




// ============================================================
// Contacts
// ============================================================

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),

  userId: integer('user_id')
    .references(() => users.id),

  name: varchar('name', { length: 100 }),

  email: varchar('email', { length: 255 }).notNull(),

  category: varchar('category', { length: 50 }).notNull(),

  message: text('message').notNull(),

  status: varchar('status', { length: 20 })
    .notNull()
    .default('unread'),

  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow(),
});


// ============================================================
// Contact Status History
// ============================================================

export const contactStatusHistory = pgTable(
  'contact_status_history',
  {
    id: serial('id').primaryKey(),

    contactId: integer('contact_id')
      .notNull()
      .references(() => contacts.id),

    oldStatus: varchar('old_status', { length: 20 })
      .notNull(),

    newStatus: varchar('new_status', { length: 20 })
      .notNull(),

    changedBy: integer('changed_by')
      .notNull()
      .references(() => users.id),

    createdAt: timestamp('created_at')
      .notNull()
      .defaultNow(),
  }
);


// ============================================================
// Relations
// ============================================================

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));


export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),

  questions: many(questions),
  answers: many(answers),
  experiences: many(experiences),

  contacts: many(contacts),
  contactStatusHistory: many(contactStatusHistory),
}));


export const invitationsRelations = relations(
  invitations,
  ({ one }) => ({
    team: one(teams, {
      fields: [invitations.teamId],
      references: [teams.id],
    }),

    invitedBy: one(users, {
      fields: [invitations.invitedBy],
      references: [users.id],
    }),
  })
);


export const teamMembersRelations = relations(
  teamMembers,
  ({ one }) => ({
    user: one(users, {
      fields: [teamMembers.userId],
      references: [users.id],
    }),

    team: one(teams, {
      fields: [teamMembers.teamId],
      references: [teams.id],
    }),
  })
);


export const activityLogsRelations = relations(
  activityLogs,
  ({ one }) => ({
    team: one(teams, {
      fields: [activityLogs.teamId],
      references: [teams.id],
    }),

    user: one(users, {
      fields: [activityLogs.userId],
      references: [users.id],
    }),
  })
);


export const questionsRelations = relations(
  questions,
  ({ one, many }) => ({
    author: one(users, {
      fields: [questions.authorId],
      references: [users.id],
    }),

    answers: many(answers),

    questionTags: many(questionTags),

    reactions: many(questionReactions),
  })
);

export const tagsRelations = relations(
  tags,
  ({ many }) => ({
    questionTags: many(questionTags),
    experienceTags: many(experienceTags),
  })
);

export const questionTagsRelations = relations(
  questionTags,
  ({ one }) => ({
    question: one(questions, {
      fields: [questionTags.questionId],
      references: [questions.id],
    }),

    tag: one(tags, {
      fields: [questionTags.tagId],
      references: [tags.id],
    }),
  })
);

export const experienceTagsRelations = relations(
  experienceTags,
  ({ one }) => ({
    experience: one(experiences, {
      fields: [experienceTags.experienceId],
      references: [experiences.id],
    }),

    tag: one(tags, {
      fields: [experienceTags.tagId],
      references: [tags.id],
    }),
  })
);


export const answersRelations = relations(
  answers,
  ({ one, many }) => ({
    question: one(questions, {
      fields: [answers.questionId],
      references: [questions.id],
    }),

    author: one(users, {
      fields: [answers.authorId],
      references: [users.id],
    }),

    reactions: many(answerReactions),
  })
);


export const contactsRelations = relations(
  contacts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [contacts.userId],
      references: [users.id],
    }),

    statusHistory: many(contactStatusHistory),
  })
);

export const contactStatusHistoryRelations = relations(
  contactStatusHistory,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [contactStatusHistory.contactId],
      references: [contacts.id],
    }),

    changedByUser: one(users, {
      fields: [contactStatusHistory.changedBy],
      references: [users.id],
    }),
  })
);



// ============================================================
// Types
// ============================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;

export type Answer = typeof answers.$inferSelect;
export type NewAnswer = typeof answers.$inferInsert;

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type ContactStatusHistory =
  typeof contactStatusHistory.$inferSelect;

export type NewContactStatusHistory =
  typeof contactStatusHistory.$inferInsert;

  
// ============================================================
// Team Data
// ============================================================

export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};


// ============================================================
// Activity Types
// ============================================================

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}



export const experiencesRelations = relations(
  experiences,
  ({ one, many }) => ({
    author: one(users, {
      fields: [experiences.authorId],
      references: [users.id],
    }),

    experienceTags: many(experienceTags),
    reactions: many(experienceReactions),
  }),
);

// ============================================================
// Experience Reactions
// 経験談へのリアクション（👀 なるほど / 👍 参考になった / 🧳 わかる！）。
// ログイン不要。visitor_id は初回リアクション時に発行する匿名ID（Cookie）。
// 同じ visitor は同じ経験談に対して、各リアクションを1回ずつだけ押せる。
// ============================================================

export const experienceReactions = pgTable(
  'experience_reactions',
  {
    id: serial('id').primaryKey(),

    // 退会パージで経験談が物理削除されたら、リアクションも一緒に消す
    experienceId: integer('experience_id')
      .notNull()
      .references(() => experiences.id, { onDelete: 'cascade' }),

    visitorId: uuid('visitor_id').notNull(),

    // ReactionType（lib/reactions/types.ts）: 'insight' | 'helpful' | 'same'
    reactionType: varchar('reaction_type', { length: 20 }).notNull(),

    createdAt: timestamp('created_at')
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // 同一リアクションの重複防止（件数集計の experience_id 検索にも使われる）
    experienceVisitorTypeUnique: uniqueIndex(
      'experience_reactions_experience_visitor_type_unique'
    ).on(table.experienceId, table.visitorId, table.reactionType),
  })
);

export const experienceReactionsRelations = relations(
  experienceReactions,
  ({ one }) => ({
    experience: one(experiences, {
      fields: [experienceReactions.experienceId],
      references: [experiences.id],
    }),
  })
);

export type ExperienceReaction = typeof experienceReactions.$inferSelect;
export type NewExperienceReaction = typeof experienceReactions.$inferInsert;

// ============================================================
// Question Reactions
// 質問へのリアクション（🙋 自分も聞きたい）。仕組みは experience_reactions と同じ。
// ============================================================

export const questionReactions = pgTable(
  'question_reactions',
  {
    id: serial('id').primaryKey(),

    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),

    visitorId: uuid('visitor_id').notNull(),

    // ReactionType（lib/reactions/types.ts）: 'want_to_know'
    reactionType: varchar('reaction_type', { length: 20 }).notNull(),

    createdAt: timestamp('created_at')
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    questionVisitorTypeUnique: uniqueIndex(
      'question_reactions_question_visitor_type_unique'
    ).on(table.questionId, table.visitorId, table.reactionType),
  })
);

export const questionReactionsRelations = relations(
  questionReactions,
  ({ one }) => ({
    question: one(questions, {
      fields: [questionReactions.questionId],
      references: [questions.id],
    }),
  })
);

export type QuestionReaction = typeof questionReactions.$inferSelect;
export type NewQuestionReaction = typeof questionReactions.$inferInsert;

// ============================================================
// Answer Reactions
// 回答へのリアクション（👀 なるほど / 👍 参考になった / 🧳 わかる！）。
// 仕組みは experience_reactions と同じ。
// ============================================================

export const answerReactions = pgTable(
  'answer_reactions',
  {
    id: serial('id').primaryKey(),

    answerId: integer('answer_id')
      .notNull()
      .references(() => answers.id, { onDelete: 'cascade' }),

    visitorId: uuid('visitor_id').notNull(),

    // ReactionType（lib/reactions/types.ts）: 'insight' | 'helpful' | 'same'
    reactionType: varchar('reaction_type', { length: 20 }).notNull(),

    createdAt: timestamp('created_at')
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    answerVisitorTypeUnique: uniqueIndex(
      'answer_reactions_answer_visitor_type_unique'
    ).on(table.answerId, table.visitorId, table.reactionType),
  })
);

export const answerReactionsRelations = relations(
  answerReactions,
  ({ one }) => ({
    answer: one(answers, {
      fields: [answerReactions.answerId],
      references: [answers.id],
    }),
  })
);

export type AnswerReaction = typeof answerReactions.$inferSelect;
export type NewAnswerReaction = typeof answerReactions.$inferInsert;

export type Experience = typeof experiences.$inferSelect;
export type NewExperience = typeof experiences.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type QuestionTag = typeof questionTags.$inferSelect;
export type NewQuestionTag = typeof questionTags.$inferInsert;

export type ExperienceTag = typeof experienceTags.$inferSelect;
export type NewExperienceTag = typeof experienceTags.$inferInsert;


// ============================================================
// Social Workflows
// SNS運用AI（Threads）: リサーチ→執筆→監査→人間承認→投稿記録
// ============================================================

export const socialWorkflows = pgTable('social_workflows', {
  id: serial('id').primaryKey(),

  platform: varchar('platform', { length: 20 })
    .notNull()
    .default('threads'),

  topic: varchar('topic', { length: 200 }).notNull(),

  audience: varchar('audience', { length: 200 }).notNull(),

  tone: varchar('tone', { length: 20 }).notNull(),

  promoteAtlas: boolean('promote_atlas').notNull().default(true),

  // ResearchResult | null（実行時にlib/ai/social側でzod検証する）
  researchResult: jsonb('research_result'),

  // PostPlan | null（企画担当の出力。実行時にlib/ai/social側でzod検証する）
  postPlan: jsonb('post_plan'),

  draft: text('draft').notNull().default(''),

  // string[]
  hashtags: jsonb('hashtags').notNull().default([]),

  // AuditResult | null
  auditResult: jsonb('audit_result'),

  // SocialWorkflowStatus
  status: varchar('status', { length: 20 })
    .notNull()
    .default('researching'),

  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),

  approvedBy: integer('approved_by').references(() => users.id),

  approvedAt: timestamp('approved_at'),

  postedAt: timestamp('posted_at'),

  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow(),
});

export const socialWorkflowsRelations = relations(
  socialWorkflows,
  ({ one }) => ({
    createdByUser: one(users, {
      fields: [socialWorkflows.createdBy],
      references: [users.id],
      relationName: 'socialWorkflowCreatedBy',
    }),

    approvedByUser: one(users, {
      fields: [socialWorkflows.approvedBy],
      references: [users.id],
      relationName: 'socialWorkflowApprovedBy',
    }),
  })
);

export type SocialWorkflowRow = typeof socialWorkflows.$inferSelect;
export type NewSocialWorkflowRow = typeof socialWorkflows.$inferInsert;


// ============================================================
// Management Meetings
// 経営判断室の会議システム: 会長が案件投入→社長整理→経営判断室発言→
// （必要なら）会長への質問/回答→一次案作成→監査室レビュー→社長総括→会長へ返却。
// AIは最後まで決定せず、必ず会長の判断で締めくくる。
// ============================================================

export const managementMeetings = pgTable('management_meetings', {
  id: serial('id').primaryKey(),

  // 会長が持ち込んだ案件
  topic: text('topic').notNull(),

  // MeetingStage（lib/ai/management/types.ts）
  stage: varchar('stage', { length: 30 }).notNull().default('framing'),

  // 会長の最終判断（自由記述）。closed時に記録する
  ownerDecision: text('owner_decision'),

  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  closedAt: timestamp('closed_at'),
});

export const meetingMessages = pgTable('meeting_messages', {
  id: serial('id').primaryKey(),

  meetingId: integer('meeting_id')
    .notNull()
    .references(() => managementMeetings.id, { onDelete: 'cascade' }),

  // 'employee' | 'owner' | 'system'（lib/ai/management/types.ts）
  authorType: varchar('author_type', { length: 20 }).notNull(),

  // Employee.id（会長発言・systemメッセージの場合はnull）
  employeeId: varchar('employee_id', { length: 50 }),

  // どの工程の発言か（MeetingStage）
  stage: varchar('stage', { length: 30 }).notNull(),

  // 発言内容。Skillごとの構造化出力、または会長・systemの自由記述をjsonbで保持する
  content: jsonb('content').notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const managementMeetingsRelations = relations(
  managementMeetings,
  ({ one, many }) => ({
    createdByUser: one(users, {
      fields: [managementMeetings.createdBy],
      references: [users.id],
    }),

    messages: many(meetingMessages),
  })
);

export const meetingMessagesRelations = relations(
  meetingMessages,
  ({ one }) => ({
    meeting: one(managementMeetings, {
      fields: [meetingMessages.meetingId],
      references: [managementMeetings.id],
    }),
  })
);

export type ManagementMeetingRow = typeof managementMeetings.$inferSelect;
export type NewManagementMeetingRow = typeof managementMeetings.$inferInsert;

export type MeetingMessageRow = typeof meetingMessages.$inferSelect;
export type NewMeetingMessageRow = typeof meetingMessages.$inferInsert;

// ============================================================
// Threads Connections
// Threads API連携（運営のThreadsアカウント）。アクセストークンは暗号化して保存する。
// 連携するのは運営の1アカウントのみを想定し、再連携時は同じ threads_user_id の行を更新する。
// ============================================================

export const threadsConnections = pgTable(
  'threads_connections',
  {
    id: serial('id').primaryKey(),

    // 連携操作を行った運営ユーザー
    connectedBy: integer('connected_by')
      .notNull()
      .references(() => users.id),

    threadsUserId: varchar('threads_user_id', { length: 64 }).notNull(),

    username: varchar('username', { length: 100 }),

    // 長期アクセストークン（AES-256-GCMで暗号化。lib/threads/crypto.ts）
    accessTokenEncrypted: text('access_token_encrypted').notNull(),

    // 最後にトークンを取得・更新した日時。長期トークンは60日で失効し、
    // 失効後は更新できない（再連携が必要）
    tokenRefreshedAt: timestamp('token_refreshed_at').notNull().defaultNow(),
    tokenExpiresAt: timestamp('token_expires_at').notNull(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    threadsUserIdUnique: uniqueIndex('threads_connections_threads_user_id_unique').on(
      table.threadsUserId
    ),
  })
);

export const threadsConnectionsRelations = relations(
  threadsConnections,
  ({ one }) => ({
    connectedByUser: one(users, {
      fields: [threadsConnections.connectedBy],
      references: [users.id],
    }),
  })
);

export type ThreadsConnectionRow = typeof threadsConnections.$inferSelect;
export type NewThreadsConnectionRow = typeof threadsConnections.$inferInsert;


// ============================================================
// Threads KPI Reports
// 分析担当のKPIレビューの結果。分析のたびに保存し、次回の分析（前回との比較）と、
// 週次の投稿作成（テーマ選定の参考情報）で使う。
// ============================================================

export const threadsKpiReports = pgTable('threads_kpi_reports', {
  id: serial('id').primaryKey(),

  // 分析を実行した運営ユーザー
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),

  // 分析した期間（「今週」＝直近7日間）
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  // 指標の表（KpiReviewInput['metrics']）
  metrics: jsonb('metrics').notNull(),

  // 分析担当に渡した背景情報（テキスト）
  context: text('context').notNull().default(''),

  // 投稿ごとの数字・フォロワー数など（WeeklySnapshot: lib/threads/reports.ts）。
  // 次回の分析で「前回の分析からの変化」を出すために使う
  snapshot: jsonb('snapshot').notNull(),

  // 分析担当の整理（KpiReview: lib/ai/skills/kpi-review.ts）
  review: jsonb('review').notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const threadsKpiReportsRelations = relations(
  threadsKpiReports,
  ({ one }) => ({
    createdByUser: one(users, {
      fields: [threadsKpiReports.createdBy],
      references: [users.id],
    }),
  })
);

export type ThreadsKpiReportRow = typeof threadsKpiReports.$inferSelect;
export type NewThreadsKpiReportRow = typeof threadsKpiReports.$inferInsert;


// ============================================================
// Account Deletions
// ユーザー削除（本人退会・運営削除）の記録と、30日後のパージ予定。
// 仕様は docs/account-deletion.md。
// users の行が将来消えても記録が残るように、users へのFKは張らない。
// ============================================================

export const accountDeletions = pgTable(
  'account_deletions',
  {
    id: serial('id').primaryKey(),

    // 削除されたユーザー（FKなし）
    userId: integer('user_id').notNull(),

    // 'full'（完全削除）| 'keep_content'（コンテンツを残す。運営のみ）
    mode: varchar('mode', { length: 20 }).notNull(),

    // 'self'（本人退会）| 'admin'（運営削除）
    actorType: varchar('actor_type', { length: 10 }).notNull(),

    // 運営が実行した場合の実行者（FKなし）
    actorId: integer('actor_id'),

    // 運営削除の理由（本人退会ではNULL）
    reason: text('reason'),

    // 運営削除で「再登録を拒否」を選んだ場合だけ保存する、メールのHMAC-SHA256
    // （鍵はAUTH_SECRET由来）。本人退会では保存しない
    emailHash: varchar('email_hash', { length: 64 }),

    requestedAt: timestamp('requested_at').notNull().defaultNow(),

    // requestedAt + 30日
    purgeAfter: timestamp('purge_after').notNull(),

    // パージ完了日時。NULLならまだ
    purgedAt: timestamp('purged_at'),
  },
  (table) => ({
    // パージ対象（未完了）の検索用
    pendingIdx: index('account_deletions_pending_idx')
      .on(table.purgeAfter)
      .where(sql`${table.purgedAt} IS NULL`),
  })
);

export type AccountDeletionRow = typeof accountDeletions.$inferSelect;
export type NewAccountDeletionRow = typeof accountDeletions.$inferInsert;

// ============================================================
// Giveaways（譲る）
// 帰国・引越しの不用品を、次の人へ譲るための掲示板。
// 運営は場の提供のみで、代金のやり取りと受け渡しは当事者同士で行う。
//
// 状態の遷移（lib/giveaways/status.ts）:
//   open（募集中）→ reserved（予定者決定）→ handed_over（受け渡し済み）→ completed（完了）
//   reserved → open（予定のキャンセル）
//   open / reserved → withdrawn（取り下げ）
//   open → expired（期限切れ。再掲載できる）
// ============================================================

export const giveaways = pgTable(
  'giveaways',
  {
    id: serial('id').primaryKey(),

    authorId: integer('author_id')
      .notNull()
      .references(() => users.id),

    title: varchar('title', { length: 100 }).notNull(),

    description: text('description').notNull(),

    // lib/giveaways/constants.ts の GIVEAWAY_CATEGORIES
    category: varchar('category', { length: 20 }).notNull(),

    country: varchar('country', { length: 100 }).notNull(),

    city: varchar('city', { length: 100 }).notNull(),

    // 受け渡しエリア（「〇〇駅周辺」程度。住所は書かない）
    area: varchar('area', { length: 100 }),

    // NULL なら無料。表示のみで、決済はしない
    priceAmount: integer('price_amount'),

    // 通貨。ISO 4217（USD など）か、自由記載（「現地通貨」など）。無料なら NULL
    currency: varchar('currency', { length: 20 }),

    // 受け渡し可能期限（例: 帰国日）。設定されていれば、この日まで募集する
    availableUntil: date('available_until'),

    status: varchar('status', { length: 20 }).notNull().default('open'),

    // 受け渡し予定者（reserved 以降）
    recipientId: integer('recipient_id').references(() => users.id),

    // 募集の期限。受け渡し可能期限があればその日の終わり、なければ投稿から30日。
    // 過ぎたら日次ジョブで expired にする
    expiresAt: timestamp('expires_at').notNull(),

    handedOverAt: timestamp('handed_over_at'),

    // completed / withdrawn / expired になった日時。メッセージ削除（1年後）の基準
    closedAt: timestamp('closed_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),

    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    // 運営による非表示、または退会による非表示
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    statusIdx: index('giveaways_status_idx').on(table.status, table.createdAt),
    authorIdx: index('giveaways_author_idx').on(table.authorId),
  })
);

export const giveawayImages = pgTable(
  'giveaway_images',
  {
    id: serial('id').primaryKey(),

    giveawayId: integer('giveaway_id')
      .notNull()
      .references(() => giveaways.id, { onDelete: 'cascade' }),

    // Vercel Blob の公開URL
    url: text('url').notNull(),

    // 表示順（0から）
    position: integer('position').notNull().default(0),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    giveawayIdx: index('giveaway_images_giveaway_idx').on(table.giveawayId),
  })
);

// 投稿者と希望者の1対1スレッド。予定者に決まると、そのまま取引ページになる
export const giveawayThreads = pgTable(
  'giveaway_threads',
  {
    id: serial('id').primaryKey(),

    giveawayId: integer('giveaway_id')
      .notNull()
      .references(() => giveaways.id, { onDelete: 'cascade' }),

    applicantId: integer('applicant_id')
      .notNull()
      .references(() => users.id),

    // 最後にメッセージが投稿された日時（一覧の並び順用）
    lastMessageAt: timestamp('last_message_at').notNull().defaultNow(),

    ownerLastReadAt: timestamp('owner_last_read_at'),

    applicantLastReadAt: timestamp('applicant_last_read_at'),

    // 新着メッセージのメールを最後に送った日時（15分に1通までにするため）
    ownerNotifiedAt: timestamp('owner_notified_at'),

    applicantNotifiedAt: timestamp('applicant_notified_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    giveawayApplicantUnique: uniqueIndex(
      'giveaway_threads_giveaway_applicant_unique'
    ).on(table.giveawayId, table.applicantId),
    applicantIdx: index('giveaway_threads_applicant_idx').on(table.applicantId),
  })
);

export const giveawayMessages = pgTable(
  'giveaway_messages',
  {
    id: serial('id').primaryKey(),

    threadId: integer('thread_id')
      .notNull()
      .references(() => giveawayThreads.id, { onDelete: 'cascade' }),

    // 送った人。system メッセージでは操作した人（日次ジョブによる自動完了では NULL）
    senderId: integer('sender_id').references(() => users.id),

    // 'user'（利用者のメッセージ）| 'system'（状態の変化のお知らせ）
    kind: varchar('kind', { length: 10 }).notNull().default('user'),

    body: text('body').notNull(),

    createdAt: timestamp('created_at').notNull().defaultNow(),

    // 運営が削除した日時。利用者には本文を見せず「運営が削除しました」と表示する（本文は運営の確認用に残す）
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    threadIdx: index('giveaway_messages_thread_idx').on(
      table.threadId,
      table.createdAt
    ),
  })
);

export const giveawayReports = pgTable('giveaway_reports', {
  id: serial('id').primaryKey(),

  giveawayId: integer('giveaway_id')
    .notNull()
    .references(() => giveaways.id, { onDelete: 'cascade' }),

  // メッセージの通報なら、そのメッセージ
  messageId: integer('message_id').references(() => giveawayMessages.id, {
    onDelete: 'set null',
  }),

  reporterId: integer('reporter_id')
    .notNull()
    .references(() => users.id),

  reason: text('reason').notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),

  // 運営が対応済みにした日時
  resolvedAt: timestamp('resolved_at'),
});

export type Giveaway = typeof giveaways.$inferSelect;
export type GiveawayImage = typeof giveawayImages.$inferSelect;
export type GiveawayThread = typeof giveawayThreads.$inferSelect;
export type GiveawayMessage = typeof giveawayMessages.$inferSelect;

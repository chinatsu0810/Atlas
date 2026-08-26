import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';


// ============================================================
// Users
// ============================================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),

  name: varchar('name', { length: 100 }),



  email: varchar('email', { length: 255 })
    .notNull()
    .unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});


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

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),

  name: varchar('name', { length: 50 })
    .notNull()
    .unique(),

  slug: varchar('slug', { length: 50 })
    .notNull()
    .unique(),

  isActive: boolean('is_active')
    .notNull()
    .default(true),

  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),
});


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
  })
);

export const tagsRelations = relations(
  tags,
  ({ many }) => ({
    questionTags: many(questionTags),
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


export const answersRelations = relations(
  answers,
  ({ one }) => ({
    question: one(questions, {
      fields: [answers.questionId],
      references: [questions.id],
    }),

    author: one(users, {
      fields: [answers.authorId],
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
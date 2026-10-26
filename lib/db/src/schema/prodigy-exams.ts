import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profilesTable } from "./prodigy-profiles";

export const examsTable = pgTable("prodigy_exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("draft"),
  tutorUserId: text("tutor_user_id")
    .notNull()
    .references(() => profilesTable.userId),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const questionsTable = pgTable("prodigy_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => examsTable.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  type: text("type", {
    enum: ["multiple_choice", "true_false", "written"],
  }).notNull(),
  options: text("options").array().notNull().default([]),
  correctAnswer: text("correct_answer"),
  points: integer("points").notNull(),
});

export type Exam = typeof examsTable.$inferSelect;
export type Question = typeof questionsTable.$inferSelect;

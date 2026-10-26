import {
  boolean,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { examsTable } from "./prodigy-exams";
import { profilesTable } from "./prodigy-profiles";

export type StoredAnswer = {
  questionId: string;
  answer: string;
};

export const examResultsTable = pgTable("prodigy_exam_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => examsTable.id),
  studentUserId: text("student_user_id")
    .notNull()
    .references(() => profilesTable.userId),
  score: real("score").notNull(),
  totalPoints: real("total_points").notNull(),
  answers: jsonb("answers").$type<StoredAnswer[]>().notNull().default([]),
  writtenAnswersPending: boolean("written_answers_pending")
    .notNull()
    .default(false),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ExamResult = typeof examResultsTable.$inferSelect;

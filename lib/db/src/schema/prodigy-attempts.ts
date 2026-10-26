import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { examsTable } from "./prodigy-exams";
import { profilesTable } from "./prodigy-profiles";

export const examAttemptsTable = pgTable("prodigy_exam_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => examsTable.id),
  studentUserId: text("student_user_id")
    .notNull()
    .references(() => profilesTable.userId),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
});

export type ExamAttempt = typeof examAttemptsTable.$inferSelect;

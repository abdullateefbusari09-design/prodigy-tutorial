import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const profilesTable = pgTable("prodigy_profiles", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["student", "tutor", "owner"] })
    .notNull()
    .default("student"),
  tutorStatus: text("tutor_status", {
    enum: ["not_applicable", "pending", "approved", "rejected"],
  })
    .notNull()
    .default("not_applicable"),
  accountStatus: text("account_status", { enum: ["active", "suspended"] })
    .notNull()
    .default("active"),
  qualifications: text("qualifications"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Profile = typeof profilesTable.$inferSelect;

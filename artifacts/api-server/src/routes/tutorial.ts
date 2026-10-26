import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  CreateExamBody,
  CreateExamResponse,
  CreateProfileBody,
  CreateProfileResponse,
  GetDashboardResponse,
  GetExamParams,
  GetExamResponse,
  GetLeaderboardResponse,
  GetProfileResponse,
  ListExamsQueryParams,
  ListExamsResponse,
  ListResultsResponse,
  ListTutorApplicationsResponse,
  ListUsersResponse,
  ReviewTutorApplicationBody,
  ReviewTutorApplicationParams,
  ReviewTutorApplicationResponse,
  StartExamParams,
  StartExamResponse,
  SubmitExamBody,
  SubmitExamParams,
  SubmitExamResponse,
  UpdateUserStatusBody,
  UpdateUserStatusParams,
  UpdateUserStatusResponse,
} from "@workspace/api-zod";
import {
  db,
  examAttemptsTable,
  examResultsTable,
  examsTable,
  profilesTable,
  questionsTable,
  type StoredAnswer,
} from "@workspace/db";
import {
  authenticatedUserId,
  getClerkIdentity,
  getProfileForUser,
  requireAuthenticated,
  requireProfile,
} from "../middlewares/tutorial-auth";

const router: IRouter = Router();
router.use(requireAuthenticated);

type ActiveProfile = NonNullable<Awaited<ReturnType<typeof requireProfile>>["profile"]>;

async function currentProfile(
  req: Request,
  res: Response,
  roles?: readonly string[],
): Promise<ActiveProfile | null> {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const result = await requireProfile(userId);
  if (result.error === "missing") {
    res.status(404).json({ error: "Complete your profile to continue" });
    return null;
  }
  if (result.error === "suspended") {
    res.status(403).json({ error: "This account is suspended" });
    return null;
  }
  const profile = result.profile;
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return null;
  }
  if (roles && !roles.includes(profile.role)) {
    res.status(403).json({ error: "This action is not available for your role" });
    return null;
  }
  return profile;
}

function publicQuestion(question: typeof questionsTable.$inferSelect) {
  return {
    id: question.id,
    prompt: question.prompt,
    type: question.type,
    options: question.options,
    points: question.points,
  };
}

function profilePayload(profile: typeof profilesTable.$inferSelect) {
  return { ...profile, createdAt: profile.createdAt.toISOString() };
}

async function examWithQuestions(exam: typeof examsTable.$inferSelect) {
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, exam.id));
  const tutor = await getProfileForUser(exam.tutorUserId);
  return {
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    durationMinutes: exam.durationMinutes,
    questionCount: questions.length,
    status: exam.status,
    tutorName: tutor?.name ?? "Approved tutor",
    questions: questions.map(publicQuestion),
  };
}

async function resultsForStudent(userId: string) {
  const rows = await db
    .select({ result: examResultsTable, exam: examsTable })
    .from(examResultsTable)
    .innerJoin(examsTable, eq(examResultsTable.examId, examsTable.id))
    .where(eq(examResultsTable.studentUserId, userId))
    .orderBy(desc(examResultsTable.submittedAt));
  return rows.map(({ result, exam }) => ({
    id: result.id,
    examId: exam.id,
    examTitle: exam.title,
    subject: exam.subject,
    score: result.score,
    totalPoints: result.totalPoints,
    submittedAt: result.submittedAt.toISOString(),
    writtenAnswersPending: result.writtenAnswersPending,
  }));
}

router.get("/profile", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const profile = await getProfileForUser(userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(GetProfileResponse.parse(profilePayload(profile)));
});

router.post("/profile", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const parsed = CreateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await getProfileForUser(userId);
  if (existing) {
    res.status(409).json({ error: "A profile already exists for this account" });
    return;
  }
  const identity = await getClerkIdentity(userId);
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const isInitialOwner = !!ownerEmail && identity.email.toLowerCase() === ownerEmail;
  const role = isInitialOwner ? "owner" : parsed.data.role;
  const [profile] = await db
    .insert(profilesTable)
    .values({
      userId,
      name: parsed.data.name,
      email: identity.email,
      role,
      tutorStatus: role === "tutor" ? "pending" : "not_applicable",
      qualifications: parsed.data.qualifications,
    })
    .returning();
  res.status(201).json(CreateProfileResponse.parse(profilePayload(profile)));
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const profile = await currentProfile(req, res);
  if (!profile) return;
  const publishedExams = await db
    .select()
    .from(examsTable)
    .where(eq(examsTable.status, "published"));
  const recentResults = await resultsForStudent(profile.userId);
  const completedExams = recentResults.length;
  const averageScore = completedExams
    ? (recentResults.reduce(
        (total, result) =>
          total + (result.totalPoints > 0 ? (result.score / result.totalPoints) * 100 : 0),
        0,
      ) /
        completedExams)
    : 0;
  const featuredExams = await Promise.all(
    publishedExams.slice(0, 5).map(async (exam) => {
      const questions = await db
        .select({ id: questionsTable.id })
        .from(questionsTable)
        .where(eq(questionsTable.examId, exam.id));
      const tutor = await getProfileForUser(exam.tutorUserId);
      return {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        durationMinutes: exam.durationMinutes,
        questionCount: questions.length,
        status: exam.status,
        tutorName: tutor?.name ?? "Approved tutor",
      };
    }),
  );
  res.json(
    GetDashboardResponse.parse({
      role: profile.role,
      totalExams: publishedExams.length,
      completedExams,
      averageScore,
      recentResults: recentResults.slice(0, 5),
      featuredExams,
    }),
  );
});

router.get("/exams", async (req, res): Promise<void> => {
  const profile = await currentProfile(req, res);
  if (!profile) return;
  const parsed = ListExamsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const exams = await db
    .select()
    .from(examsTable)
    .where(eq(examsTable.status, "published"))
    .orderBy(desc(examsTable.createdAt));
  const filtered = parsed.data.subject
    ? exams.filter((exam) => exam.subject === parsed.data.subject)
    : exams;
  const summaries = await Promise.all(
    filtered.map(async (exam) => {
      const questions = await db
        .select({ id: questionsTable.id })
        .from(questionsTable)
        .where(eq(questionsTable.examId, exam.id));
      const tutor = await getProfileForUser(exam.tutorUserId);
      return {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        durationMinutes: exam.durationMinutes,
        questionCount: questions.length,
        status: exam.status,
        tutorName: tutor?.name ?? "Approved tutor",
      };
    }),
  );
  res.json(ListExamsResponse.parse(summaries));
});

router.post("/exams", async (req, res): Promise<void> => {
  const profile = await currentProfile(req, res, ["tutor"]);
  if (!profile) return;
  if (profile.tutorStatus !== "approved") {
    res.status(403).json({ error: "An approved tutor account is required" });
    return;
  }
  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { title, subject, durationMinutes, status, questions } = parsed.data;
  if (
    questions.some(
      (question) =>
        question.type !== "written" &&
        (!question.correctAnswer || !question.options?.includes(question.correctAnswer)),
    )
  ) {
    res.status(400).json({ error: "Each objective question needs a valid answer key" });
    return;
  }
  const result = await db.transaction(async (tx) => {
    const [exam] = await tx
      .insert(examsTable)
      .values({
        title,
        subject,
        durationMinutes,
        status: status ?? "draft",
        tutorUserId: profile.userId,
      })
      .returning();
    const insertedQuestions = await tx
      .insert(questionsTable)
      .values(
        questions.map((question) => ({
          examId: exam.id,
          prompt: question.prompt,
          type: question.type,
          options: question.options ?? [],
          correctAnswer: question.correctAnswer ?? null,
          points: question.points,
        })),
      )
      .returning();
    return {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      durationMinutes: exam.durationMinutes,
      questionCount: insertedQuestions.length,
      status: exam.status,
      tutorName: profile.name,
      questions: insertedQuestions.map(publicQuestion),
    };
  });
  res.status(201).json(CreateExamResponse.parse(result));
});

router.get("/exams/:examId", async (req, res): Promise<void> => {
  const profile = await currentProfile(req, res);
  if (!profile) return;
  const params = GetExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [exam] = await db
    .select()
    .from(examsTable)
    .where(eq(examsTable.id, params.data.examId))
    .limit(1);
  if (!exam || (exam.status !== "published" && exam.tutorUserId !== profile.userId && profile.role !== "owner")) {
    res.status(404).json({ error: "Examination not found" });
    return;
  }
  res.json(GetExamResponse.parse(await examWithQuestions(exam)));
});

router.post("/exams/:examId/start", async (req, res): Promise<void> => {
  const profile = await currentProfile(req, res, ["student"]);
  if (!profile) return;
  const params = StartExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [exam] = await db
    .select()
    .from(examsTable)
    .where(and(eq(examsTable.id, params.data.examId), eq(examsTable.status, "published")))
    .limit(1);
  if (!exam) {
    res.status(404).json({ error: "Published examination not found" });
    return;
  }
  const [openAttempt] = await db
    .select()
    .from(examAttemptsTable)
    .where(
      and(
        eq(examAttemptsTable.examId, exam.id),
        eq(examAttemptsTable.studentUserId, profile.userId),
        isNull(examAttemptsTable.submittedAt),
      ),
    )
    .orderBy(desc(examAttemptsTable.startedAt))
    .limit(1);
  if (openAttempt && openAttempt.expiresAt.getTime() >= Date.now() - 30_000) {
    const questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.examId, exam.id));
    res.status(201).json(
      StartExamResponse.parse({
        attemptId: openAttempt.id,
        examId: exam.id,
        durationMinutes: exam.durationMinutes,
        startedAt: openAttempt.startedAt.toISOString(),
        expiresAt: openAttempt.expiresAt.toISOString(),
        questions: questions.map(publicQuestion),
      }),
    );
    return;
  }
  if (openAttempt) {
    await db
      .update(examAttemptsTable)
      .set({ submittedAt: openAttempt.expiresAt })
      .where(eq(examAttemptsTable.id, openAttempt.id));
  }
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + exam.durationMinutes * 60_000);
  const [attempt] = await db
    .insert(examAttemptsTable)
    .values({ examId: exam.id, studentUserId: profile.userId, startedAt, expiresAt })
    .returning();
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, exam.id));
  res.status(201).json(
    StartExamResponse.parse({
      attemptId: attempt.id,
      examId: exam.id,
      durationMinutes: exam.durationMinutes,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      questions: questions.map(publicQuestion),
    }),
  );
});

router.post("/exams/:examId/submit", async (req, res): Promise<void> => {
  const profile = await currentProfile(req, res, ["student"]);
  if (!profile) return;
  const params = SubmitExamParams.safeParse(req.params);
  const parsed = SubmitExamBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : parsed.success ? "Invalid submission" : parsed.error.message,
    });
    return;
  }
  const [attempt] = await db
    .select()
    .from(examAttemptsTable)
    .where(
      and(
        eq(examAttemptsTable.id, parsed.data.attemptId),
        eq(examAttemptsTable.examId, params.data.examId),
        eq(examAttemptsTable.studentUserId, profile.userId),
        isNull(examAttemptsTable.submittedAt),
      ),
    )
    .limit(1);
  if (!attempt) {
    res.status(404).json({ error: "Active examination attempt not found" });
    return;
  }
  if (Date.now() > attempt.expiresAt.getTime() + 30_000) {
    res.status(409).json({ error: "The examination time limit has passed" });
    return;
  }
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, params.data.examId));
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const answerByQuestion = new Map<string, string>();
  for (const answer of parsed.data.answers) {
    if (!questionById.has(answer.questionId)) {
      res.status(400).json({ error: "Submission contains a question outside this examination" });
      return;
    }
    answerByQuestion.set(answer.questionId, answer.answer);
  }
  let score = 0;
  const totalPoints = questions.reduce((total, question) => total + question.points, 0);
  let writtenAnswersPending = false;
  const storedAnswers: StoredAnswer[] = questions.map((question) => {
    const answer = answerByQuestion.get(question.id) ?? "";
    if (question.type === "written") {
      if (answer.trim()) writtenAnswersPending = true;
    } else if (
      answer.trim().toLocaleLowerCase() ===
      (question.correctAnswer ?? "").trim().toLocaleLowerCase()
    ) {
      score += question.points;
    }
    return { questionId: question.id, answer };
  });
  const submittedAt = new Date();
  const result = await db.transaction(async (tx) => {
    const [updatedAttempt] = await tx
      .update(examAttemptsTable)
      .set({ submittedAt })
      .where(
        and(
          eq(examAttemptsTable.id, attempt.id),
          eq(examAttemptsTable.studentUserId, profile.userId),
          isNull(examAttemptsTable.submittedAt),
        ),
      )
      .returning();
    if (!updatedAttempt) return null;
    const [created] = await tx
      .insert(examResultsTable)
      .values({
        examId: params.data.examId,
        studentUserId: profile.userId,
        score,
        totalPoints,
        answers: storedAnswers,
        writtenAnswersPending,
        submittedAt,
      })
      .returning();
    const [exam] = await tx
      .select()
      .from(examsTable)
      .where(eq(examsTable.id, params.data.examId))
      .limit(1);
    return {
      id: created.id,
      examId: exam.id,
      examTitle: exam.title,
      subject: exam.subject,
      score: created.score,
      totalPoints: created.totalPoints,
      submittedAt: created.submittedAt.toISOString(),
      writtenAnswersPending: created.writtenAnswersPending,
    };
  });
  if (!result) {
    res.status(409).json({ error: "This examination attempt has already been submitted" });
    return;
  }
  res.status(201).json(SubmitExamResponse.parse(result));
});

router.get("/results", async (req, res): Promise<void> => {
  const profile = await currentProfile(req, res, ["student"]);
  if (!profile) return;
  res.json(ListResultsResponse.parse(await resultsForStudent(profile.userId)));
});

router.get("/leaderboard", async (req, res): Promise<void> => {
  const profile = await currentProfile(req, res);
  if (!profile) return;
  const results = await db.select().from(examResultsTable);
  const profiles = await db.select().from(profilesTable).where(eq(profilesTable.role, "student"));
  const byStudent = new Map<
    string,
    { scoreTotal: number; count: number }
  >();
  for (const result of results) {
    const current = byStudent.get(result.studentUserId) ?? { scoreTotal: 0, count: 0 };
    current.scoreTotal += result.totalPoints > 0 ? (result.score / result.totalPoints) * 100 : 0;
    current.count += 1;
    byStudent.set(result.studentUserId, current);
  }
  const entries = profiles
    .map((student) => {
      const aggregate = byStudent.get(student.userId);
      return {
        userId: student.userId,
        name: student.name,
        score: aggregate && aggregate.count
          ? Math.round(aggregate.scoreTotal / aggregate.count)
          : 0,
        examsCompleted: aggregate?.count ?? 0,
      };
    })
    .filter((student) => student.examsCompleted > 0)
    .sort((a, b) => b.score - a.score || b.examsCompleted - a.examsCompleted)
    .slice(0, 50)
    .map((student, index) => ({ rank: index + 1, ...student }));
  res.json(GetLeaderboardResponse.parse(entries));
});

router.get("/owner/tutors", async (req, res): Promise<void> => {
  const profile = await currentProfile(req, res, ["owner"]);
  if (!profile) return;
  const applications = await db
    .select()
    .from(profilesTable)
    .where(and(eq(profilesTable.role, "tutor"), eq(profilesTable.tutorStatus, "pending")));
  res.json(ListTutorApplicationsResponse.parse(applications.map(profilePayload)));
});

router.patch("/owner/tutors/:userId", async (req, res): Promise<void> => {
  const owner = await currentProfile(req, res, ["owner"]);
  if (!owner) return;
  const params = ReviewTutorApplicationParams.safeParse(req.params);
  const parsed = ReviewTutorApplicationBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : parsed.success ? "Invalid review" : parsed.error.message,
    });
    return;
  }
  const [updated] = await db
    .update(profilesTable)
    .set({ tutorStatus: parsed.data.status })
    .where(
      and(
        eq(profilesTable.userId, params.data.userId),
        eq(profilesTable.role, "tutor"),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Tutor application not found" });
    return;
  }
  res.json(ReviewTutorApplicationResponse.parse(profilePayload(updated)));
});

router.get("/owner/users", async (req, res): Promise<void> => {
  const profile = await currentProfile(req, res, ["owner"]);
  if (!profile) return;
  const users = await db.select().from(profilesTable).orderBy(desc(profilesTable.createdAt));
  res.json(ListUsersResponse.parse(users.map(profilePayload)));
});

router.patch("/owner/users/:userId", async (req, res): Promise<void> => {
  const owner = await currentProfile(req, res, ["owner"]);
  if (!owner) return;
  const params = UpdateUserStatusParams.safeParse(req.params);
  const parsed = UpdateUserStatusBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : parsed.success ? "Invalid account status" : parsed.error.message,
    });
    return;
  }
  if (params.data.userId === owner.userId && parsed.data.accountStatus === "suspended") {
    res.status(400).json({ error: "You cannot suspend your own owner account" });
    return;
  }
  const [target] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, params.data.userId))
    .limit(1);
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.role === "owner") {
    res.status(403).json({ error: "Owner accounts cannot be changed from this screen" });
    return;
  }
  const [updated] = await db
    .update(profilesTable)
    .set({ accountStatus: parsed.data.accountStatus })
    .where(eq(profilesTable.userId, params.data.userId))
    .returning();
  res.json(UpdateUserStatusResponse.parse(profilePayload(updated)));
});

export default router;

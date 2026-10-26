import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle2,
  ChevronRight, Clock3, Crown, FilePlus2, LogOut, Menu, Minus, Plus,
  ShieldCheck, Timer, Trophy, X,
} from 'lucide-react';
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import {
  getGetDashboardQueryKey, getGetExamQueryKey, getGetLeaderboardQueryKey, getGetProfileQueryKey,
  getListExamsQueryKey, getListResultsQueryKey, getListTutorApplicationsQueryKey, getListUsersQueryKey,
  useCreateExam, useCreateProfile, useGetDashboard, useGetExam, useGetLeaderboard, useGetProfile,
  useListExams, useListResults, useListTutorApplications, useListUsers, useReviewTutorApplication,
  useStartExam, useSubmitExam, useUpdateUserStatus,
} from '@workspace/api-client-react';
import type { ExamAttempt, ExamInput, Profile, QuestionInput, QuestionInputType } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Government', 'Literature', 'Other'];

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const appearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#c8a75e', colorForeground: '#eee8da', colorMutedForeground: '#a39b89',
    colorDanger: '#d57965', colorBackground: '#1b1914', colorInput: '#11100d',
    colorInputForeground: '#eee8da', colorNeutral: '#4a4435', fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.45rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#1b1914] rounded-xl w-[440px] max-w-full overflow-hidden border border-[#39362d]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#eee8da] font-semibold',
    headerSubtitle: 'text-[#a39b89]',
    socialButtonsBlockButtonText: 'text-[#eee8da]',
    formFieldLabel: 'text-[#ded5c2]',
    footerActionLink: 'text-[#c8a75e]',
    footerActionText: 'text-[#a39b89]',
    dividerText: 'text-[#a39b89]',
    identityPreviewEditButton: 'text-[#c8a75e]',
    formFieldSuccessText: 'text-[#89a782]',
    alertText: 'text-[#ded5c2]',
    logoBox: 'mx-auto',
    logoImage: 'max-h-10',
    socialButtonsBlockButton: 'border-[#39362d] bg-[#171612] hover:bg-[#252219]',
    formButtonPrimary: 'bg-[#c8a75e] text-[#1d1a13] hover:bg-[#d5b875]',
    formFieldInput: 'bg-[#11100d] border-[#39362d] text-[#eee8da]',
    footerAction: 'border-[#39362d]',
    dividerLine: 'bg-[#39362d]',
    alert: 'border-[#39362d] bg-[#211f19]',
    otpCodeFieldInput: 'bg-[#11100d] border-[#39362d] text-[#eee8da]',
    formFieldRow: 'text-[#ded5c2]',
    main: 'text-[#eee8da]',
  },
};

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand flex items-center gap-3" data-testid="link-brand-home">
    <span className="grid h-10 w-10 place-items-center border border-[#806b3d] text-[#c8a75e]"><Crown size={19} strokeWidth={1.5} /></span>
    {!compact && <span className="leading-tight"><span className="block text-[11px] font-semibold tracking-[.19em]">THE PRODIGY</span><span className="mt-1 block text-[9px] tracking-[.29em] text-[#a39b89]">TUTORIAL</span></span>}
  </Link>;
}

function ButtonLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return <Link href={href} className={primary ? 'btn-primary' : 'btn-outline'} data-testid={`link-${href.replace(/[/:]/g, '') || 'home'}`}>{children}</Link>;
}

function HomeContent() {
  return <main className="min-h-[100dvh]">
    <header className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-5 md:px-10">
      <Brand />
      <nav className="hidden items-center gap-9 text-[13px] text-[#c3bcad] md:flex">
        <a href="#method" className="hover:text-[#c8a75e]">Our method</a><a href="#disciplines" className="hover:text-[#c8a75e]">Disciplines</a><a href="#tutors" className="hover:text-[#c8a75e]">Tutors</a>
      </nav>
      <div className="flex items-center gap-3"><ButtonLink href="/sign-in">Sign in</ButtonLink><ButtonLink href="/sign-up" primary>Begin learning <ArrowRight size={15} /></ButtonLink></div>
    </header>
    <section className="relative mx-auto grid max-w-[1320px] items-center gap-10 px-5 pb-20 pt-12 md:min-h-[620px] md:grid-cols-[1.08fr_.92fr] md:px-10 md:pb-24 md:pt-16">
      <div className="animate-in relative z-10">
        <p className="eyebrow mb-7 flex items-center gap-3"><span className="h-px w-9 bg-[#c8a75e]" />A sharper way to prepare</p>
        <h1 className="serif max-w-[760px] text-[clamp(3.35rem,8.2vw,7.2rem)] leading-[.96] tracking-[-.055em]">Make your next<br /><span className="italic text-[#c8a75e]">breakthrough.</span></h1>
        <p className="mt-8 max-w-[480px] text-[15px] leading-7 text-[#aaa393]">Serious exam preparation, built around the way you learn. Find your next challenge, measure your progress, and keep moving forward.</p>
        <div className="mt-9 flex flex-wrap items-center gap-4"><ButtonLink href="/sign-up" primary>Create your study room <ArrowRight size={16} /></ButtonLink><a href="#method" className="flex items-center gap-2 px-2 text-sm text-[#c8c0b0] hover:text-[#c8a75e]">Explore the platform <ArrowDownRight size={15} /></a></div>
        <div className="mt-14 flex items-center gap-7 border-t border-[#302d25] pt-6">
          <div><span className="serif block text-2xl text-[#e7dfcd]">One clear goal</span><span className="mt-1 block text-xs text-[#898374]">Better prepared, every day.</span></div><span className="h-9 w-px bg-[#39362d]" /><span className="eyebrow">Learn smarter<br /><span className="mt-1 inline-block text-[#ded5c2]">Achieve greater.</span></span>
        </div>
      </div>
      <div className="relative mx-auto flex aspect-[.88] w-full max-w-[520px] items-center justify-center md:aspect-[.9]">
        <div className="absolute inset-[7%] border border-[#62512e] rounded-[48%_48%_3px_3px]" />
        <div className="absolute inset-[12%] rounded-[48%_48%_3px_3px] bg-[radial-gradient(ellipse_at_50%_40%,#40351f_0%,#201e18_42%,#14130f_75%)]" />
        <div className="absolute left-[19%] top-[18%] h-[58%] w-[62%] rounded-[50%] border border-[#c8a75e33] rotate-[-14deg]" />
        <div className="relative z-10 flex h-[67%] w-[67%] flex-col items-center justify-center rounded-[50%] border border-[#c8a75e66] text-center">
          <span className="eyebrow">The discipline of</span><span className="serif mt-3 text-5xl leading-none text-[#ead9af] md:text-6xl">knowing</span><span className="serif italic text-4xl text-[#c8a75e] md:text-5xl">more.</span>
          <span className="mt-7 h-10 w-px bg-[#c8a75e]" /><span className="mono mt-3 text-[9px] tracking-[.26em] text-[#a39b89]">STUDY WITH PURPOSE</span>
        </div>
        <div className="absolute bottom-[10%] right-[3%] z-10 surface-soft p-4"><span className="mono block text-[9px] tracking-[.16em] text-[#9e957f]">YOUR NEXT SESSION</span><span className="serif mt-2 block text-xl">Starts with you.</span></div>
      </div>
    </section>
    <div className="gold-rule mx-auto max-w-[1320px] opacity-60" />
    <section id="method" className="mx-auto grid max-w-[1320px] gap-12 px-5 py-20 md:grid-cols-[.7fr_1.3fr] md:px-10 md:py-28">
      <div><p className="eyebrow">A considered approach</p><h2 className="serif mt-5 text-4xl leading-tight md:text-5xl">Practice with<br /><span className="italic text-[#c8a75e]">intention.</span></h2></div>
      <div className="grid gap-8 sm:grid-cols-3">
        {[['01', 'Choose your focus', 'Explore carefully structured exams across the subjects that matter to you.'], ['02', 'Work at your pace', 'Timed sessions bring exam conditions into a thoughtful, focused space.'], ['03', 'See your progress', 'Review your results and use every attempt to guide what comes next.']].map(([n, title, copy]) => <article key={n} className="border-t border-[#4a4435] pt-5"><span className="mono text-xs text-[#c8a75e]">{n} / THE PROCESS</span><h3 className="serif mt-7 text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-[#9f998a]">{copy}</p></article>)}
      </div>
    </section>
    <section id="disciplines" className="border-y border-[#302d25] bg-[#11100d]">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-16 md:grid-cols-[.8fr_1.2fr] md:px-10 md:py-20">
        <div><p className="eyebrow">The syllabus, thoughtfully covered</p><h2 className="serif mt-5 max-w-lg text-4xl leading-tight md:text-5xl">Every subject has<br />a deeper level.</h2></div>
        <div className="grid grid-cols-2 gap-px border border-[#302d25] bg-[#302d25] sm:grid-cols-4">{subjects.slice(0, 7).map((s, i) => <div key={s} className="bg-[#15140f] p-5 sm:p-7"><span className="mono text-[10px] text-[#9f926f]">0{i + 1}</span><p className="serif mt-5 text-lg">{s}</p></div>)}<div className="bg-[#1d1b16] p-5 sm:p-7"><span className="mono text-[10px] text-[#c8a75e]">AND MORE</span><p className="serif mt-5 text-lg">Your next subject</p></div></div>
      </div>
    </section>
    <section id="tutors" className="mx-auto flex max-w-[1320px] flex-col justify-between gap-9 px-5 py-20 md:flex-row md:items-end md:px-10 md:py-28">
      <div><p className="eyebrow">A community for achievement</p><h2 className="serif mt-5 max-w-2xl text-4xl leading-tight md:text-6xl">Guided by expertise.<br /><span className="italic text-[#c8a75e]">Driven by you.</span></h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#9f998a]">Approved tutors create rigorous, thoughtful assessments. Students take the lead in their learning, with clear results to help chart a path forward.</p></div>
      <ButtonLink href="/sign-up" primary>Find your focus <ArrowRight size={16} /></ButtonLink>
    </section>
    <footer className="border-t border-[#302d25] px-5 py-8 md:px-10"><div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-5 sm:flex-row sm:items-center"><Brand /><span className="text-xs text-[#777267]">Learn smarter, Achieve greater. © {new Date().getFullYear()} THE PRODIGY TUTORIAL</span></div></footer>
  </main>;
}

function SignInPage() {
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>;
}

function SignUpPage() {
  const [role, setRole] = useState<string | null>(() => sessionStorage.getItem('prodigySignupRole'));
  if (!role) return <AuthFrame><div className="surface w-full max-w-[440px] p-7 md:p-9">
    <p className="eyebrow">Your journey, your way</p><h1 className="serif mt-4 text-3xl">How will you use your study room?</h1><p className="mt-3 text-sm leading-6 text-[#a39b89]">Tutor access is reviewed by our owner before exam publishing is enabled.</p>
    <div className="mt-7 grid gap-3">
      <button className="surface-soft flex items-center justify-between p-4 text-left hover:border-[#c8a75e]" onClick={() => { sessionStorage.setItem('prodigySignupRole', 'student'); setRole('student'); }} data-testid="button-role-student"><span><span className="block font-semibold">I’m here to learn</span><span className="mt-1 block text-xs text-[#938c7d]">Student access</span></span><ChevronRight size={17} className="text-[#c8a75e]" /></button>
      <button className="surface-soft flex items-center justify-between p-4 text-left hover:border-[#c8a75e]" onClick={() => { sessionStorage.setItem('prodigySignupRole', 'tutor'); setRole('tutor'); }} data-testid="button-role-tutor"><span><span className="block font-semibold">I’m here to teach</span><span className="mt-1 block text-xs text-[#938c7d]">Apply as a tutor</span></span><ChevronRight size={17} className="text-[#c8a75e]" /></button>
    </div><Link href="/" className="mt-7 inline-flex text-sm text-[#a39b89] hover:text-[#c8a75e]"><ArrowLeft size={15} className="mr-2" /> Back to home</Link>
  </div></AuthFrame>;
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={`${basePath}/dashboard`} /></AuthFrame>;
}

function AuthFrame({ children }: { children: ReactNode }) {
  return <div className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_50%_0%,#292419_0%,#100f0c_54%)] px-4 py-6">
    <div className="mx-auto flex max-w-[1320px] items-center justify-between"><Brand /><Link href="/" className="text-xs text-[#9f998a] hover:text-[#c8a75e]">Return to home</Link></div>
    <div className="mx-auto flex min-h-[calc(100dvh-100px)] max-w-[1000px] items-center justify-center gap-14 py-10">
      <aside className="hidden flex-1 md:block"><p className="eyebrow">THE PRODIGY TUTORIAL</p><h2 className="serif mt-5 max-w-md text-5xl leading-tight">A quieter place<br />to do <i className="text-[#c8a75e]">your best.</i></h2><div className="mt-8 max-w-sm text-sm leading-7 text-[#9f998a]">Thoughtful practice. Clear progress. A study room built around your next achievement.</div></aside>
      <div className="w-full max-w-[440px]">{children}</div>
    </div>
  </div>;
}

function CacheSync() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (previous.current !== undefined && previous.current !== id) client.clear();
    previous.current = id;
  }), [addListener, client]);
  return null;
}

function LoadingPanel({ label = 'Opening your study room' }: { label?: string }) {
  return <div className="surface animate-in p-8" role="status" data-testid="status-loading"><div className="h-2 w-24 animate-pulse rounded bg-[#4a4435]" /><div className="mt-5 h-7 w-2/3 animate-pulse rounded bg-[#29261e]" /><div className="mt-3 h-4 w-full animate-pulse rounded bg-[#252219]" /><p className="mt-7 text-xs text-[#9f998a]">{label}…</p></div>;
}

function ErrorPanel({ onRetry, message = 'We couldn’t load this section.' }: { onRetry: () => void; message?: string }) {
  return <div className="surface p-8 text-center" role="alert" data-testid="status-error"><p className="serif text-2xl">A pause in the session.</p><p className="mt-2 text-sm text-[#a39b89]">{message}</p><button onClick={onRetry} className="btn-outline mt-5" data-testid="button-retry">Try again</button></div>;
}

function EmptyState({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <div className="surface flex flex-col items-center px-6 py-12 text-center" data-testid="state-empty"><BookOpen size={24} className="text-[#c8a75e]" /><h3 className="serif mt-4 text-2xl">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-[#9f998a]">{copy}</p>{action && <div className="mt-6">{action}</div>}</div>;
}

function Protected({ children, roles }: { children: (profile: Profile) => ReactNode; roles?: string[] }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const profile = useGetProfile({ query: { enabled: isLoaded && !!isSignedIn, queryKey: getGetProfileQueryKey(), retry: false } });
  const createProfile = useCreateProfile();
  const [name, setName] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [profileError, setProfileError] = useState('');
  const errorStatus = (profile.error as { status?: number } | null)?.status;
  const role = sessionStorage.getItem('prodigySignupRole') === 'tutor' ? 'tutor' : 'student';
  useEffect(() => {
    if (user) setName(user.fullName || user.firstName || '');
  }, [user]);
  if (!isLoaded) return <div className="min-h-[100dvh] p-6"><LoadingPanel /></div>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (profile.isLoading) return <AppShell><LoadingPanel /></AppShell>;
  if (profile.error && errorStatus !== 404) return <AppShell><ErrorPanel message="Your account details couldn’t be reached. Your session is still secure." onRetry={() => void profile.refetch()} /></AppShell>;
  if (profile.data?.accountStatus === 'suspended') return <AppShell><EmptyState title="Account access is paused." copy="This account is currently suspended. Contact the platform owner if you think this is a mistake." /></AppShell>;
  if (!profile.data) return <AppShell><div className="mx-auto max-w-xl surface p-7 md:p-10">
    <p className="eyebrow">One last detail</p><h1 className="serif mt-3 text-3xl">Set up your profile</h1><p className="mt-2 text-sm leading-6 text-[#a39b89]">Your study room is ready. Add your name to continue as a {role}.</p>
    <form className="mt-7 space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); setProfileError(''); createProfile.mutate({ data: { name: name.trim(), role, ...(role === 'tutor' && qualifications.trim() ? { qualifications: qualifications.trim() } : {}) } }, { onSuccess: () => { sessionStorage.removeItem('prodigySignupRole'); void queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() }); }, onError: () => setProfileError('Your profile could not be saved. Please try again.') }); }} data-testid="form-create-profile">
      <label className="block text-xs text-[#c6beac]">Your name<input className="field mt-2" value={name} onChange={e => setName(e.target.value)} required maxLength={120} data-testid="input-profile-name" /></label>
      {role === 'tutor' && <label className="block text-xs text-[#c6beac]">Qualifications <span className="text-[#827c6f]">(optional)</span><textarea className="field mt-2 min-h-24 resize-y" value={qualifications} onChange={e => setQualifications(e.target.value)} placeholder="Your subject experience or credentials" data-testid="input-qualifications" /></label>}
      {profileError && <p className="text-sm text-[#d57965]" role="alert">{profileError}</p>}
      <button className="btn-primary w-full" disabled={createProfile.isPending || !name.trim()} data-testid="button-save-profile">{createProfile.isPending ? 'Saving your profile…' : 'Continue to your study room'} <ArrowRight size={15} /></button>
    </form>
  </div></AppShell>;
  if (roles && !roles.includes(profile.data.role)) return <AppShell><EmptyState title="This room has a different key." copy="Your current account role does not have access to this area." action={<ButtonLink href="/dashboard">Go to dashboard</ButtonLink>} /></AppShell>;
  return <>{children(profile.data)}</>;
}

const navItems = [
  { href: '/dashboard', title: 'Overview', icon: BookOpen },
  { href: '/tutor', title: 'Tutor studio', icon: FilePlus2, roles: ['tutor'] },
  { href: '/results', title: 'My results', icon: Award, roles: ['student'] },
  { href: '/leaderboard', title: 'Leaderboard', icon: Trophy },
  { href: '/owner', title: 'Governance', icon: ShieldCheck, roles: ['owner'] },
];

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();
  const profile = useGetProfile({ query: { queryKey: getGetProfileQueryKey(), retry: false } }).data;
  const role = profile?.role || 'student';
  const links = navItems.filter(item => !item.roles || item.roles.includes(role));
  return <div className="min-h-[100dvh] bg-[#100f0c]">
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#302d25] bg-[#11100df2] px-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-4"><button className="btn-outline px-2 py-2 md:hidden" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)} data-testid="button-toggle-menu">{menuOpen ? <X size={17} /> : <Menu size={17} />}</button><Brand /></div>
      <div className="flex items-center gap-4"><span className="hidden text-xs text-[#8f897b] sm:block">{profile?.role === 'tutor' && profile.tutorStatus === 'pending' ? 'Tutor application pending' : 'Your dedicated study space'}</span><button className="flex items-center gap-2 border-l border-[#39362d] pl-4 text-left" onClick={() => void signOut({ redirectUrl: basePath || '/' })} data-testid="button-sign-out"><span className="grid h-8 w-8 place-items-center rounded-full border border-[#806b3d] bg-[#211f19] text-xs text-[#d5bd81]">{(profile?.name || user?.firstName || 'P').slice(0, 1).toUpperCase()}</span><span className="hidden text-xs text-[#c3bcad] sm:inline">{profile?.name || user?.firstName || 'My account'}</span><LogOut size={14} className="text-[#9f998a]" /></button></div>
    </header>
    <div className="mx-auto flex max-w-[1600px]">
      <aside className={`${menuOpen ? 'fixed inset-x-0 top-[68px] z-20 block border-b border-[#302d25] bg-[#11100d] p-4' : 'hidden'} w-full md:sticky md:top-[68px] md:block md:h-[calc(100dvh-68px)] md:w-[238px] md:shrink-0 md:border-r md:border-[#302d25] md:bg-[#12110e] md:p-5`}>
        <p className="eyebrow mb-4 px-3 pt-3">Study room</p><nav className="space-y-1">{links.map(({ href, title, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors ${location === href ? 'bg-[#262219] text-[#d8bd7b]' : 'text-[#aaa393] hover:bg-[#1b1914] hover:text-[#e7dfcd]'}`} data-testid={`nav-${href.slice(1)}`}><Icon size={16} />{title}{location === href && <ChevronRight size={14} className="ml-auto" />}</Link>)}</nav>
        <div className="mt-10 border-t border-[#302d25] pt-5"><p className="px-3 text-[10px] leading-5 text-[#777267]">LEARN SMARTER,<br /><span className="text-[#c8a75e]">ACHIEVE GREATER.</span></p></div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-7 md:px-8 md:py-10">{children}</main>
    </div>
  </div>;
}

function PageHeading({ overline, title, copy, children }: { overline: string; title: string; copy?: string; children?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 border-b border-[#302d25] pb-6 sm:flex-row sm:items-end"><div><p className="eyebrow">{overline}</p><h1 className="serif mt-2 text-4xl leading-tight md:text-5xl">{title}</h1>{copy && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9f998a]">{copy}</p>}</div>{children}</div>;
}

function Dashboard() {
  const client = useQueryClient();
  const dashboard = useGetDashboard();
  const profile = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } }).data;
  const exams = useListExams();
  if (dashboard.isLoading) return <AppShell><LoadingPanel /></AppShell>;
  if (dashboard.isError) return <AppShell><ErrorPanel onRetry={() => void dashboard.refetch()} /></AppShell>;
  if (!dashboard.data) return <AppShell><LoadingPanel label="Opening your dashboard" /></AppShell>;
  const data = dashboard.data;
  const isTutorWaiting = profile?.role === 'tutor' && profile.tutorStatus !== 'approved';
  return <AppShell><PageHeading overline={`Good to see you${profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}`} title={profile?.role === 'owner' ? 'The control room.' : 'Your next achievement.'} copy={profile?.role === 'tutor' ? 'Build assessments that move students forward.' : 'A clear view of your work, your progress, and what comes next.'} />
    {isTutorWaiting && <div className="mb-7 flex gap-3 border border-[#61502d] bg-[#211e16] p-4 text-sm" data-testid="status-tutor-pending"><Clock3 size={18} className="shrink-0 text-[#c8a75e]" /><div><strong className="text-[#e7d7b2]">{profile.tutorStatus === 'pending' ? 'Your tutor application is in review.' : 'Tutor access is not active.'}</strong><p className="mt-1 text-xs leading-5 text-[#aaa393]">{profile.tutorStatus === 'pending' ? 'You’ll see your tutor studio once the owner approves your application. Your student study room is ready in the meantime.' : 'You may continue studying while tutor access is reviewed.'}</p></div></div>}
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat label="Exams available" value={data.totalExams} detail="Across the library" icon={BookOpen} />
      <Stat label="Completed" value={data.completedExams} detail="Your completed sessions" icon={CheckCircle2} />
      <Stat label="Average score" value={`${Math.round(data.averageScore)}%`} detail="Across all attempts" icon={Award} />
    </div>
    <div className="mt-8 grid gap-8 xl:grid-cols-[1.35fr_.65fr]">
      <section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Chosen for your next step</p><h2 className="serif mt-2 text-2xl">Featured exams</h2></div><span className="mono text-[10px] text-[#827c6f]">{data.featuredExams.length} EXAMS</span></div>
        {data.featuredExams.length ? <div className="space-y-3">{data.featuredExams.map((exam, index) => <article key={exam.id} className="surface flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center" data-testid={`card-exam-${exam.id}`}><div className="flex gap-4"><span className="mono mt-1 text-xs text-[#b99b5b]">0{index + 1}</span><div><h3 className="font-semibold">{exam.title}</h3><p className="mt-2 text-xs text-[#938c7d]">{exam.subject} <span className="mx-2 text-[#665f50]">/</span>{exam.questionCount} questions <span className="mx-2 text-[#665f50]">/</span>{exam.durationMinutes} minutes</p></div></div><Link href={`/exam/${exam.id}`} className="btn-outline shrink-0" data-testid={`link-start-exam-${exam.id}`}>Begin exam <ArrowRight size={14} /></Link></article>)}</div> : <EmptyState title="Your next challenge is on the way." copy="There are no featured exams here yet. Visit the exam library when new assessments are published." action={<Link href="/dashboard#library" className="btn-outline">Browse exam library</Link>} />}
      </section>
      <section><div className="mb-4"><p className="eyebrow">The latest</p><h2 className="serif mt-2 text-2xl">Recent results</h2></div>
        {data.recentResults.length ? <div className="surface divide-y divide-[#302d25]">{data.recentResults.slice(0, 5).map(result => <div key={result.id} className="flex items-center justify-between gap-3 p-4" data-testid={`row-result-${result.id}`}><div><p className="text-sm font-medium">{result.examTitle}</p><p className="mt-1 text-xs text-[#8e887a]">{result.subject} · {new Date(result.submittedAt).toLocaleDateString()}</p></div><span className="mono text-sm text-[#d0b56e]">{result.score}/{result.totalPoints}</span></div>)}</div> : <EmptyState title="A blank page is full of promise." copy="Your completed exams will appear here." />}
      </section>
    </div>
    <section id="library" className="mt-10 border-t border-[#302d25] pt-7"><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Browse the full selection</p><h2 className="serif mt-2 text-2xl">Exam library</h2></div><span className="text-xs text-[#8f897b]">{exams.data?.length || 0} available</span></div>
      {exams.isLoading ? <LoadingPanel label="Loading the exam library" /> : exams.isError ? <ErrorPanel message="The exam library couldn’t be reached." onRetry={() => void exams.refetch()} /> : exams.data?.length ? <div className="grid gap-3 md:grid-cols-2">{exams.data.map(exam => <Link key={exam.id} href={`/exam/${exam.id}`} className="surface flex items-center justify-between p-4 hover:border-[#70603c]" data-testid={`card-library-exam-${exam.id}`}><div><p className="text-sm font-semibold">{exam.title}</p><p className="mt-2 text-xs text-[#8e887a]">{exam.subject} · {exam.durationMinutes} min</p></div><ArrowRight size={15} className="text-[#c8a75e]" /></Link>)}</div> : <EmptyState title="The library is being prepared." copy="Published exams will appear here as tutors add new assessments." />}
    </section>
  </AppShell>;
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: ReactNode; detail: string; icon: typeof BookOpen }) {
  return <div className="surface p-5" data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-center justify-between"><span className="eyebrow">{label}</span><Icon size={17} className="text-[#b89a58]" /></div><strong className="serif mt-4 block text-3xl">{value}</strong><p className="mt-1 text-xs text-[#8f897b]">{detail}</p></div>;
}

function Results() {
  const results = useListResults();
  return <AppShell><PageHeading overline="Your record" title="Results, not guesses." copy="Every completed exam gives you a clearer picture of what you know and what to practice next." />
    {results.isLoading ? <LoadingPanel label="Gathering your results" /> : results.isError ? <ErrorPanel message="Your results could not be loaded." onRetry={() => void results.refetch()} /> : results.data?.length ? <div className="overflow-hidden border border-[#302d25]">
      <div className="hidden grid-cols-[1.3fr_.8fr_.7fr_.7fr] gap-4 bg-[#1b1914] px-5 py-3 text-[10px] tracking-[.14em] text-[#8f897b] sm:grid"><span>ASSESSMENT</span><span>SUBJECT</span><span>RESULT</span><span>SUBMITTED</span></div>
      {results.data.map(result => <article key={result.id} className="grid gap-3 border-t border-[#302d25] bg-[#15140f] px-5 py-4 sm:grid-cols-[1.3fr_.8fr_.7fr_.7fr] sm:items-center" data-testid={`row-result-${result.id}`}><div><p className="font-medium">{result.examTitle}</p>{result.writtenAnswersPending && <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#c8a75e]"><Clock3 size={11} /> Written responses awaiting review</span>}</div><span className="text-xs text-[#aaa393]">{result.subject}</span><span className="mono text-sm text-[#d0b56e]">{result.score}<span className="text-[#777267]"> / {result.totalPoints}</span></span><span className="text-xs text-[#8f897b]">{new Date(result.submittedAt).toLocaleDateString()}</span></article>)}
    </div> : <EmptyState title="The first result is yours to earn." copy="When you submit your first exam, your score and review status will be recorded here." action={<ButtonLink href="/dashboard">Explore exams</ButtonLink>} />}
  </AppShell>;
}

function Leaderboard() {
  const board = useGetLeaderboard({ query: { queryKey: getGetLeaderboardQueryKey() } });
  return <AppShell><PageHeading overline="A little friendly perspective" title="The leaderboard." copy="Students ranked by their examination performance. Focus on your own progress; the rest will follow." />
    {board.isLoading ? <LoadingPanel label="Loading student rankings" /> : board.isError ? <ErrorPanel message="The leaderboard could not be loaded." onRetry={() => void board.refetch()} /> : board.data?.length ? <div className="mx-auto max-w-3xl border border-[#302d25]">
      <div className="grid grid-cols-[60px_1fr_100px_100px] gap-3 bg-[#1b1914] px-4 py-3 text-[10px] tracking-[.14em] text-[#8f897b] sm:px-6"><span>RANK</span><span>STUDENT</span><span>AVERAGE</span><span>EXAMS</span></div>
      {board.data.map((entry, index) => <div key={entry.userId} className={`grid grid-cols-[60px_1fr_100px_100px] items-center gap-3 border-t border-[#302d25] px-4 py-4 sm:px-6 ${index === 0 ? 'bg-[#211e16]' : 'bg-[#15140f]'}`} data-testid={`row-rank-${entry.rank}`}><span className="mono flex items-center gap-1 text-sm text-[#c8a75e]">{entry.rank === 1 ? <Crown size={15} /> : `#${entry.rank}`}</span><span className="font-medium">{entry.name}</span><span className="mono text-sm">{entry.score}%</span><span className="mono text-xs text-[#9f998a]">{entry.examsCompleted}</span></div>)}
    </div> : <EmptyState title="The table is waiting to take shape." copy="Student rankings will appear here after exam results have been recorded." />}
  </AppShell>;
}

const blankQuestion = (): QuestionInput => ({ prompt: '', type: 'multiple_choice', options: ['', '', '', ''], correctAnswer: '', points: 1 });

function TutorStudio() {
  const client = useQueryClient();
  const profile = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } }).data;
  const createExam = useCreateExam();
  const exams = useListExams();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(subjects[0]);
  const [otherSubject, setOtherSubject] = useState('');
  const [duration, setDuration] = useState('45');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [questions, setQuestions] = useState<QuestionInput[]>([blankQuestion()]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  if (profile?.tutorStatus !== 'approved') return <AppShell><PageHeading overline="Tutor studio" title="A studio for thoughtful assessment." /><div className="mx-auto max-w-2xl surface p-8"><Clock3 className="text-[#c8a75e]" /><h2 className="serif mt-4 text-3xl">{profile?.tutorStatus === 'pending' ? 'Your application is being reviewed.' : 'Tutor approval is required.'}</h2><p className="mt-3 text-sm leading-6 text-[#a39b89]">Exam creation is available to approved tutors. You can continue exploring the student dashboard while your access status is pending.</p><ButtonLink href="/dashboard">Return to dashboard</ButtonLink></div></AppShell>;
  const updateQuestion = (index: number, patch: Partial<QuestionInput>) => setQuestions(current => current.map((q, i) => i === index ? { ...q, ...patch } : q));
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); setError(''); setNotice('');
    const chosenSubject = subject === 'Other' ? otherSubject.trim() : subject;
    const normalized = questions.map(q => ({ ...q, prompt: q.prompt.trim(), options: q.type === 'written' ? [] : q.type === 'true_false' ? ['True', 'False'] : q.options?.map(o => o.trim()).filter(Boolean) }));
    if (!title.trim() || !chosenSubject || normalized.some(q => !q.prompt || (q.type !== 'written' && (!q.options?.length || !q.correctAnswer)))) { setError('Complete every prompt and provide an answer key for each objective question.'); return; }
    const data: ExamInput = { title: title.trim(), subject: chosenSubject, durationMinutes: Number(duration), status, questions: normalized };
    createExam.mutate({ data }, { onSuccess: () => { setTitle(''); setSubject(subjects[0]); setOtherSubject(''); setDuration('45'); setStatus('draft'); setQuestions([blankQuestion()]); setNotice(status === 'published' ? 'Your assessment is now published.' : 'Your draft assessment is saved.'); void client.invalidateQueries({ queryKey: getListExamsQueryKey() }); void client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); }, onError: () => setError('The exam could not be created. Check the details and try again.') });
  };
  return <AppShell><PageHeading overline="Tutor studio" title="Author an exam." copy="Set a focused challenge for students. Include an answer key for objective questions; written responses are reviewed later." />
    {notice && <div className="mb-5 flex items-center gap-2 border border-[#4b6145] bg-[#192018] p-3 text-sm text-[#c5d8bb]" role="status"><CheckCircle2 size={17} />{notice}</div>}
    <form onSubmit={handleSubmit} className="grid gap-7 xl:grid-cols-[1fr_280px]" data-testid="form-create-exam">
      <div className="space-y-6">
        <section className="surface p-5 md:p-7"><p className="eyebrow">The assessment</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs text-[#c6beac] sm:col-span-2">Exam title<input className="field mt-2" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Foundations of Mechanics" maxLength={160} required data-testid="input-exam-title" /></label>
          <label className="text-xs text-[#c6beac]">Subject<select className="field mt-2" value={subject} onChange={e => setSubject(e.target.value)} data-testid="select-exam-subject">{subjects.map(s => <option key={s}>{s}</option>)}</select></label>
          {subject === 'Other' && <label className="text-xs text-[#c6beac]">Custom subject<input className="field mt-2" value={otherSubject} onChange={e => setOtherSubject(e.target.value)} required data-testid="input-other-subject" /></label>}
          <label className="text-xs text-[#c6beac]">Duration in minutes<input className="field mt-2" type="number" min="1" max="240" value={duration} onChange={e => setDuration(e.target.value)} required data-testid="input-exam-duration" /></label>
        </div></section>
        <section className="space-y-4"><div className="flex items-end justify-between"><div><p className="eyebrow">The questions</p><h2 className="serif mt-2 text-2xl">{questions.length} question{questions.length === 1 ? '' : 's'}</h2></div><button type="button" className="btn-outline" onClick={() => setQuestions(q => [...q, blankQuestion()])} data-testid="button-add-question"><Plus size={15} /> Add question</button></div>
          {questions.map((question, index) => <QuestionEditor key={index} index={index} question={question} update={patch => updateQuestion(index, patch)} remove={() => setQuestions(q => q.filter((_, i) => i !== index))} canRemove={questions.length > 1} />)}
        </section>
      </div>
      <aside className="h-fit space-y-4 xl:sticky xl:top-24"><div className="surface p-5"><p className="eyebrow">Publishing</p><h3 className="serif mt-2 text-xl">Choose your state</h3><div className="mt-5 space-y-2"><label className={`flex cursor-pointer items-center justify-between border p-3 text-sm ${status === 'draft' ? 'border-[#b39658] bg-[#211e16]' : 'border-[#302d25]'}`}><span>Save as draft</span><input type="radio" name="status" checked={status === 'draft'} onChange={() => setStatus('draft')} data-testid="radio-draft" /></label><label className={`flex cursor-pointer items-center justify-between border p-3 text-sm ${status === 'published' ? 'border-[#b39658] bg-[#211e16]' : 'border-[#302d25]'}`}><span>Publish for students</span><input type="radio" name="status" checked={status === 'published'} onChange={() => setStatus('published')} data-testid="radio-publish" /></label></div><p className="mt-4 text-xs leading-5 text-[#8f897b]">Published exams appear in the student exam library. Drafts are saved privately.</p></div>
        <p className="text-xs leading-5 text-[#827c6f]">Published assessments appear in the student library. The available exam list only returns published exams, so drafts are not shown below.</p>
        {error && <p className="text-sm leading-5 text-[#d57965]" role="alert">{error}</p>}<button type="submit" className="btn-primary w-full" disabled={createExam.isPending} data-testid="button-submit-exam">{createExam.isPending ? 'Saving assessment…' : status === 'published' ? 'Publish assessment' : 'Save draft'} <ArrowRight size={15} /></button>
      </aside>
    </form>
    <section className="mt-12 border-t border-[#302d25] pt-7"><p className="eyebrow">Published in the library</p><h2 className="serif mt-2 text-2xl">Available exams</h2>{exams.isLoading ? <LoadingPanel label="Loading published exams" /> : exams.isError ? <ErrorPanel message="Published exams couldn’t be loaded." onRetry={() => void exams.refetch()} /> : exams.data?.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{exams.data.map(exam => <div key={exam.id} className="surface flex justify-between p-4"><div><p className="font-medium">{exam.title}</p><p className="mt-1 text-xs text-[#8f897b]">{exam.subject} · {exam.questionCount} questions</p></div><span className="eyebrow self-start">Published</span></div>)}</div> : <p className="mt-3 text-sm text-[#8f897b]">No published assessments to display yet.</p>}</section>
  </AppShell>;
}

function QuestionEditor({ index, question, update, remove, canRemove }: { index: number; question: QuestionInput; update: (patch: Partial<QuestionInput>) => void; remove: () => void; canRemove: boolean }) {
  const changeType = (type: QuestionInputType) => update({ type, options: type === 'true_false' ? ['True', 'False'] : type === 'written' ? [] : ['', '', '', ''], correctAnswer: '' });
  return <div className="surface p-5" data-testid={`card-question-${index + 1}`}><div className="mb-4 flex items-center justify-between"><p className="mono text-xs text-[#c8a75e]">QUESTION {String(index + 1).padStart(2, '0')}</p><div className="flex items-center gap-4"><label className="flex items-center gap-2 text-xs text-[#aaa393]">Points<input className="field w-20 py-2" type="number" min="1" value={question.points} onChange={e => update({ points: Number(e.target.value) })} data-testid={`input-question-points-${index + 1}`} /></label>{canRemove && <button type="button" onClick={remove} aria-label="Remove question" className="text-[#8f897b] hover:text-[#d57965]" data-testid={`button-remove-question-${index + 1}`}><Minus size={17} /></button>}</div></div>
    <textarea className="field min-h-20 resize-y" value={question.prompt} onChange={e => update({ prompt: e.target.value })} placeholder="Write a clear question prompt…" required data-testid={`input-question-prompt-${index + 1}`} />
    <label className="mt-4 block max-w-xs text-xs text-[#c6beac]">Response type<select className="field mt-2" value={question.type} onChange={e => changeType(e.target.value as QuestionInputType)} data-testid={`select-question-type-${index + 1}`}><option value="multiple_choice">Multiple choice</option><option value="true_false">True / false</option><option value="written">Written response</option></select></label>
    {question.type !== 'written' ? <div className="mt-4 space-y-2"><p className="text-[10px] tracking-[.12em] text-[#8f897b]">OPTIONS · SELECT THE CORRECT ANSWER</p>{(question.options || []).map((option, i) => <div key={i} className="flex items-center gap-3"><input className="accent-[#c8a75e]" type="radio" name={`answer-${index}`} checked={question.correctAnswer === option && !!option} onChange={() => update({ correctAnswer: option })} aria-label={`Set option ${i + 1} as correct`} data-testid={`radio-correct-${index + 1}-${i + 1}`} /><input className="field py-2.5" value={option} onChange={e => { const next = [...(question.options || [])]; next[i] = e.target.value; update({ options: next, correctAnswer: question.correctAnswer === option ? e.target.value : question.correctAnswer }); }} placeholder={`Option ${i + 1}`} required data-testid={`input-option-${index + 1}-${i + 1}`} /></div>)}</div> : <p className="mt-4 text-xs text-[#8f897b]">Written responses will be submitted for review. Include a grading rubric in the question prompt.</p>}
  </div>;
}

function ExamPage() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId || '';
  const [, setLocation] = useLocation();
  const exam = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const start = useStartExam();
  const submit = useSubmitExam();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [submissionFailed, setSubmissionFailed] = useState(false);
  const didSubmit = useRef(false);
  const started = useRef(false);
  const examQuestions = useMemo(() => attempt?.questions || [], [attempt?.questions]);
  useEffect(() => {
    if (!exam.data || started.current || start.isPending || start.isError) return;
    started.current = true;
    start.mutate({ examId }, {
      onSuccess: setAttempt,
      onError: () => { started.current = false; },
    });
  }, [exam.data, examId, start.isError, start.isPending]);
  useEffect(() => {
    if (!attempt) return;
    const updateRemaining = () => setSeconds(Math.max(0, Math.ceil((Date.parse(attempt.expiresAt) - Date.now()) / 1000)));
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [attempt]);
  const onSubmitRef = useRef<() => void>(() => undefined);
  onSubmitRef.current = () => {
    if (didSubmit.current || !attempt) return;
    didSubmit.current = true;
    submit.mutate({ examId, data: { attemptId: attempt.attemptId, answers: examQuestions.map(q => ({ questionId: q.id, answer: answers[q.id] || '' })) } }, {
      onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListResultsQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setLocation('/results'); },
      onError: () => { didSubmit.current = false; setSubmissionFailed(true); setConfirm(false); },
    });
  };
  useEffect(() => {
    if (seconds === null || didSubmit.current || submissionFailed || !attempt) return;
    if (seconds <= 0) { onSubmitRef.current(); return; }
  }, [seconds, attempt, submissionFailed]);
  const formatTime = (value: number) => `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
  if (exam.isLoading) return <AppShell><LoadingPanel label="Preparing your exam" /></AppShell>;
  if (exam.isError || !exam.data) return <AppShell><ErrorPanel message="This exam couldn’t be opened. It may no longer be available." onRetry={() => void exam.refetch()} /></AppShell>;
  if (!attempt) {
    if (start.isError) return <AppShell><ErrorPanel message="The timed attempt could not be started. Please retry to continue." onRetry={() => { started.current = true; start.reset(); start.mutate({ examId }, { onSuccess: setAttempt, onError: () => { started.current = false; } }); }} /></AppShell>;
    return <AppShell><LoadingPanel label="Starting your timed examination" /></AppShell>;
  }
  const answered = Object.values(answers).filter(Boolean).length;
  return <AppShell><div className="mx-auto max-w-4xl">
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-[#302d25] pb-5"><div><Link href="/dashboard" className="mb-4 inline-flex items-center gap-2 text-xs text-[#938c7d] hover:text-[#c8a75e]" data-testid="link-exit-exam"><ArrowLeft size={14} /> Exit exam</Link><p className="eyebrow">{exam.data.subject} · {exam.data.questionCount} questions</p><h1 className="serif mt-2 text-3xl md:text-4xl">{exam.data.title}</h1></div><div className={`surface flex items-center gap-3 px-4 py-3 ${seconds !== null && seconds < 300 ? 'border-[#98614b] text-[#df9b75]' : ''}`} data-testid="status-exam-timer"><Timer size={17} className="text-[#c8a75e]" /><div><span className="mono block text-lg">{formatTime(seconds ?? 0)}</span><span className="text-[9px] uppercase tracking-[.13em] text-[#8f897b]">Time remaining</span></div></div></div>
    <div className="mb-7 flex items-center justify-between text-xs text-[#938c7d]"><span>{answered} of {examQuestions.length} answered</span><span>{seconds !== null && Math.ceil(seconds / 60)} minutes allocated</span></div>
    <div className="space-y-5">{examQuestions.map((question, index) => <article className="surface p-5 md:p-7" key={question.id} data-testid={`question-${question.id}`}><div className="flex items-start justify-between gap-4"><div><p className="mono text-[10px] text-[#c8a75e]">QUESTION {String(index + 1).padStart(2, '0')}</p><h2 className="mt-3 text-lg leading-7">{question.prompt}</h2></div><span className="shrink-0 text-xs text-[#8f897b]">{question.points} pt{question.points === 1 ? '' : 's'}</span></div>
      {question.type === 'written' ? <textarea className="field mt-5 min-h-32 resize-y" placeholder="Write your response…" value={answers[question.id] || ''} onChange={e => setAnswers(a => ({ ...a, [question.id]: e.target.value }))} data-testid={`input-answer-${question.id}`} /> : <div className="mt-5 grid gap-2">{(question.type === 'true_false' ? ['True', 'False'] : question.options).map((option, oi) => <button key={oi} type="button" onClick={() => setAnswers(a => ({ ...a, [question.id]: option }))} className={`flex items-center gap-3 border p-3 text-left text-sm ${answers[question.id] === option ? 'border-[#b39658] bg-[#211e16]' : 'border-[#302d25] hover:border-[#665735]'}`} data-testid={`button-answer-${question.id}-${oi}`}><span className={`grid h-5 w-5 place-items-center rounded-full border ${answers[question.id] === option ? 'border-[#c8a75e] text-[#c8a75e]' : 'border-[#5a5446]'}`}>{answers[question.id] === option && <Check size={12} />}</span>{option}</button>)}</div>}
    </article>)}</div>
    <div className="mt-7 flex flex-col items-start justify-between gap-4 border-t border-[#302d25] pt-5 sm:flex-row sm:items-center"><p className="text-xs text-[#8f897b]">Your answers are saved in this session until submitted.</p><button className="btn-primary" onClick={() => setConfirm(true)} disabled={submit.isPending || didSubmit.current} data-testid="button-submit-answers">{submit.isPending ? 'Submitting…' : 'Submit exam'} <ArrowRight size={15} /></button></div>
    {submit.isError && <p role="alert" className="mt-4 text-sm text-[#d57965]">Submission failed. Your answers are still here; please submit again.</p>}
    {confirm && !didSubmit.current && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true"><div className="surface w-full max-w-md p-7"><p className="eyebrow">Ready to finish?</p><h2 className="serif mt-3 text-2xl">Submit this exam?</h2><p className="mt-3 text-sm leading-6 text-[#a39b89]">{answered} of {examQuestions.length} questions have an answer. You cannot edit answers after submitting.</p><div className="mt-6 flex justify-end gap-3"><button className="btn-outline" onClick={() => setConfirm(false)} data-testid="button-cancel-submit">Keep working</button><button className="btn-primary" onClick={() => onSubmitRef.current()} disabled={submit.isPending} data-testid="button-confirm-submit">Submit now <ArrowRight size={14} /></button></div></div></div>}
  </div></AppShell>;
}

function OwnerConsole() {
  const client = useQueryClient();
  const applications = useListTutorApplications();
  const users = useListUsers();
  const review = useReviewTutorApplication();
  const updateUser = useUpdateUserStatus();
  const [message, setMessage] = useState('');
  const approve = (userId: string, status: 'approved' | 'rejected') => {
    setMessage('');
    review.mutate({ userId, data: { status } }, { onSuccess: () => { setMessage(status === 'approved' ? 'Tutor approved.' : 'Application declined.'); void client.invalidateQueries({ queryKey: getListTutorApplicationsQueryKey() }); void client.invalidateQueries({ queryKey: getListUsersQueryKey() }); }, onError: () => setMessage('The review could not be saved. Please try again.') });
  };
  const toggleUserStatus = (userId: string, accountStatus: 'active' | 'suspended') => {
    setMessage('');
    updateUser.mutate({ userId, data: { accountStatus } }, {
      onSuccess: () => {
        setMessage(accountStatus === 'suspended' ? 'User access suspended.' : 'User access restored.');
        void client.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: () => setMessage('The user status could not be changed. Please try again.'),
    });
  };
  return <AppShell><PageHeading overline="Owner governance" title="Access, thoughtfully managed." copy="Review tutor applications and maintain a clear view of platform users." />
    {message && <p className={`mb-5 border p-3 text-sm ${message.startsWith('The') ? 'border-[#875547] text-[#d99a85]' : 'border-[#4b6145] text-[#c5d8bb]'}`} role="status">{message}</p>}
    <section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Approval queue</p><h2 className="serif mt-2 text-2xl">Tutor applications</h2></div><span className="mono text-[10px] text-[#938c7d]">{applications.data?.filter(a => a.tutorStatus === 'pending').length || 0} PENDING</span></div>
      {applications.isLoading ? <LoadingPanel label="Loading tutor applications" /> : applications.isError ? <ErrorPanel message="Tutor applications are unavailable." onRetry={() => void applications.refetch()} /> : applications.data?.filter(a => a.tutorStatus === 'pending').length ? <div className="space-y-3">{applications.data.filter(a => a.tutorStatus === 'pending').map(app => <article className="surface flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center" key={app.userId} data-testid={`card-application-${app.userId}`}><div><h3 className="font-semibold">{app.name}</h3><p className="mt-1 text-xs text-[#938c7d]">{app.email} · Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'date unavailable'}</p><span className="mt-2 inline-block border border-[#665735] px-2 py-1 text-[10px] uppercase tracking-[.12em] text-[#c8a75e]">{app.tutorStatus}</span></div><div className="flex gap-2"><button className="btn-outline" disabled={review.isPending} onClick={() => approve(app.userId, 'rejected')} data-testid={`button-reject-${app.userId}`}><X size={14} /> Decline</button><button className="btn-primary" disabled={review.isPending} onClick={() => approve(app.userId, 'approved')} data-testid={`button-approve-${app.userId}`}><Check size={14} /> Approve tutor</button></div></article>)}</div> : <EmptyState title="No applications need review." copy="New tutor applications will appear here for your review." />}
    </section>
    <section className="mt-11 border-t border-[#302d25] pt-7"><div className="mb-4"><p className="eyebrow">Platform access</p><h2 className="serif mt-2 text-2xl">Users</h2></div>
      {users.isLoading ? <LoadingPanel label="Loading platform users" /> : users.isError ? <ErrorPanel message="The user list is unavailable." onRetry={() => void users.refetch()} /> : users.data?.length ? <div className="overflow-hidden border border-[#302d25]"><div className="hidden grid-cols-[1fr_1.1fr_.7fr_.8fr_150px] gap-4 bg-[#1b1914] px-5 py-3 text-[10px] tracking-[.14em] text-[#8f897b] sm:grid"><span>NAME</span><span>EMAIL</span><span>ROLE</span><span>STATUS</span><span>ACCESS</span></div>{users.data.map(u => <div key={u.userId} className="grid gap-2 border-t border-[#302d25] bg-[#15140f] px-5 py-4 sm:grid-cols-[1fr_1.1fr_.7fr_.8fr_150px] sm:items-center" data-testid={`row-user-${u.userId}`}><span className="font-medium">{u.name}</span><span className="text-xs text-[#a39b89]">{u.email}</span><span className="text-xs capitalize text-[#d4c69f]">{u.role}</span><span className="text-xs text-[#8f897b]">{u.role === 'tutor' ? u.tutorStatus : u.accountStatus || 'active'}</span><span>{u.role === 'owner' ? <span className="text-xs text-[#c8a75e]">Protected owner</span> : <button className="btn-outline px-3 py-2 text-[11px]" disabled={updateUser.isPending} onClick={() => toggleUserStatus(u.userId, u.accountStatus === 'suspended' ? 'active' : 'suspended')} data-testid={`button-toggle-user-${u.userId}`}>{u.accountStatus === 'suspended' ? 'Restore access' : 'Suspend access'}</button>}</span></div>)}</div> : <EmptyState title="No registered users yet." copy="New student and tutor profiles will appear here." />}
    </section>
  </AppShell>;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Redirect to="/dashboard" />;
  return <HomeContent />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to return to your study room' } }, signUp: { start: { title: 'Begin your journey', subtitle: 'Create your Prodigy Tutorial account' } } }}
    routerPush={to => setLocation(stripBase(to))} routerReplace={to => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}><CacheSync /><Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/dashboard" component={() => <Protected>{() => <Dashboard />}</Protected>} />
      <Route path="/tutor" component={() => <Protected roles={['tutor']}>{() => <TutorStudio />}</Protected>} />
      <Route path="/exam/:examId" component={() => <Protected>{() => <ExamPage />}</Protected>} />
      <Route path="/results" component={() => <Protected roles={['student']}>{() => <Results />}</Protected>} />
      <Route path="/leaderboard" component={() => <Protected>{() => <Leaderboard />}</Protected>} />
      <Route path="/owner" component={() => <Protected roles={['owner']}>{() => <OwnerConsole />}</Protected>} />
      <Route component={NotFound} />
    </Switch></QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) return <WouterRouter base={basePath}><HomeContent /></WouterRouter>;
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}

export default App;

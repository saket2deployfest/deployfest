'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  Shield,
  ShieldCheck,
  User,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { getAuthErrorMessage } from '@/lib/auth-service';
import type { UserRole } from '@/types/auth';
import { cn } from '@/lib/utils';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.01z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.2c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const roleOptions: { value: UserRole; label: string; description: string; icon: typeof User }[] = [
  {
    value: 'user',
    label: 'Attendee',
    description: 'Report issues & get help',
    icon: User,
  },
  {
    value: 'admin',
    label: 'Operator',
    description: 'Manage event security',
    icon: ShieldCheck,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading, loginEmail, loginGoogle } = useAuth();

  const [role, setRole] = useState<UserRole>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.push(user.role === 'admin' ? '/dashboard' : '/user/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const adminCredentials =
    role === 'admin' ? { username, employeeId } : undefined;

  const redirectAfterLogin = (userRole: UserRole) => {
    router.push(userRole === 'admin' ? '/dashboard' : '/user/dashboard');
  };

  const handleAuthError = (error: unknown) => {
    const code =
      error instanceof Error && 'code' in error
        ? String((error as { code: string }).code)
        : error instanceof Error
          ? error.message
          : 'unknown';
    toast({
      title: 'Authentication failed',
      description: getAuthErrorMessage(code),
      variant: 'destructive',
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const profile = await loginEmail(email, password, role, adminCredentials);
      toast({
        title: 'Welcome back',
        description: `Signed in as ${profile.fullName}`,
      });
      redirectAfterLogin(profile.role);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (role === 'admin' && (!username || !employeeId)) {
      toast({
        title: 'Admin details required',
        description: 'Enter your username and employee ID before signing in with Google.',
        variant: 'destructive',
      });
      return;
    }

    setGoogleLoading(true);
    try {
      const profile = await loginGoogle(role, adminCredentials);
      toast({
        title: 'Welcome back',
        description: `Signed in as ${profile.fullName}`,
      });
      redirectAfterLogin(profile.role);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const isBusy = loading || googleLoading;

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-background">


      {/* Cybernetic Dynamic Background */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background" />

      {/* Interactive drifting nebulae */}
      <div 
        className="pointer-events-none absolute -left-48 top-1/4 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px] transition-all duration-[8s]"
        style={{ animation: 'subtle-drift 20s infinite ease-in-out' }}
      />
      <div 
        className="pointer-events-none absolute right-10 bottom-10 h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-[100px] transition-all duration-[10s]"
        style={{ animation: 'subtle-drift 25s infinite ease-in-out-reverse' }}
      />

      {/* Floating Sparkles - static values prevent hydration mismatch */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        {[
          { w: 4, h: 4, l: 8,  t: 20, dur: 9,  delay: 0   },
          { w: 2, h: 2, l: 18, t: 60, dur: 12, delay: 1.5 },
          { w: 3, h: 3, l: 30, t: 35, dur: 8,  delay: 3   },
          { w: 5, h: 5, l: 42, t: 75, dur: 11, delay: 0.8 },
          { w: 2, h: 2, l: 55, t: 15, dur: 14, delay: 2.2 },
          { w: 4, h: 4, l: 65, t: 55, dur: 10, delay: 4   },
          { w: 3, h: 3, l: 74, t: 30, dur: 7,  delay: 1   },
          { w: 2, h: 2, l: 82, t: 80, dur: 13, delay: 5   },
          { w: 5, h: 5, l: 90, t: 45, dur: 9,  delay: 2   },
          { w: 3, h: 3, l: 12, t: 85, dur: 11, delay: 3.5 },
          { w: 2, h: 2, l: 48, t: 22, dur: 8,  delay: 0.5 },
          { w: 4, h: 4, l: 60, t: 68, dur: 12, delay: 1.8 },
          { w: 3, h: 3, l: 25, t: 50, dur: 10, delay: 4.5 },
          { w: 2, h: 2, l: 78, t: 12, dur: 9,  delay: 2.8 },
          { w: 5, h: 5, l: 36, t: 90, dur: 14, delay: 0.3 },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-400"
            style={{
              width: `${p.w}px`,
              height: `${p.h}px`,
              left: `${p.l}%`,
              top: `${p.t}%`,
              animation: `float-particle ${p.dur}s infinite linear`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Left Column - Showcase & Branding */}
      <div className="relative hidden w-[45%] flex-col justify-between border-r border-border/40 bg-card/20 p-12 backdrop-blur-md lg:flex">
        {/* Header brand name */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary animate-pulse" />
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            DRISTI AI
          </span>
        </div>

        {/* Dynamic Showcase Panel */}
        <div className="space-y-8 my-auto max-w-md">
          {/* Logo Showcase with Active Scanline */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-1 backdrop-blur-sm shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]">
            <img 
              src="/logo.jpg" 
              alt="Dristi AI Logo" 
              className="h-48 w-full object-cover rounded-xl transition-all duration-700 group-hover:scale-[1.03]"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />
            {/* Glowing scanline */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent animate-scan pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/60 border border-white/10 text-cyan-400 tracking-widest uppercase">
                SYSTEM ACTIVE
              </span>
              <span className="text-[10px] font-mono text-white/50">
                v1.0.4-LOCKED
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Event Guardian
              <span className="block text-muted-foreground text-lg font-normal mt-1">
                Secure access portal
              </span>
            </h1>
          </div>

          <div className="space-y-4">
            {[
              'Real-time crowd monitoring & alerts',
              'Role-based access for operators & attendees',
              'Secure Firebase authentication with JWT caching',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-muted-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground/60 flex justify-between items-center">
          <span>© {new Date().getFullYear()} Dristi AI Platform</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            Edge Servers Secured
          </span>
        </div>
      </div>

      {/* Login form */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 sm:p-10 z-10">
        
        {/* Floating Mobile Logo Header */}
        <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
          <div className="relative h-16 w-36 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <img src="/logo.jpg" alt="Dristi AI" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400 animate-scan pointer-events-none" />
          </div>
          <span className="text-sm font-semibold tracking-wider text-cyan-400 mt-1">DRISTI AI</span>
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Sign in</h2>
            <p className="mt-2 text-muted-foreground">
              Choose your role and authenticate securely
            </p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3">
            {roleOptions.map(({ value, label, description, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                disabled={isBusy}
                className={cn(
                  'group relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200',
                  'hover:border-primary/50 hover:bg-primary/5',
                  role === value
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                    : 'border-border bg-card/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                    role === value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                {role === value && (
                  <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            ))}
          </div>

          {/* Google sign-in */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-3 font-medium border-border/80 hover:bg-muted/50 transition-all"
            onClick={handleGoogleLogin}
            disabled={isBusy}
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
              or sign in with email
            </span>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div
              className={cn(
                'grid gap-4 overflow-hidden transition-all duration-300',
                role === 'admin' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={role === 'admin'}
                  disabled={isBusy}
                  className="h-11 bg-card/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  placeholder="DRISHTI-001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required={role === 'admin'}
                  disabled={isBusy}
                  className="h-11 bg-card/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isBusy}
                className="h-11 bg-card/50"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isBusy}
                  className="h-11 bg-card/50 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
              disabled={isBusy}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign in
                </>
              )}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-sm text-muted-foreground">
              New attendee?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create an account
              </Link>
            </p>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

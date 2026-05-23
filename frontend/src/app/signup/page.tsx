'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Shield, 
  ArrowLeft, 
  Check, 
  Activity, 
  Sparkles, 
  Cpu, 
  Eye, 
  EyeOff, 
  RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { signUpWithEmail, getAuthErrorMessage } from '@/lib/auth-service';
import { cn } from '@/lib/utils';

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto rotate features every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Not Entered', color: 'bg-muted', text: 'text-muted-foreground', pct: 'w-0' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    if (score <= 2) {
      return { score, label: 'Weak Password', color: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]', text: 'text-red-500', pct: 'w-1/3' };
    }
    if (score <= 4) {
      return { score, label: 'Medium Strength', color: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]', text: 'text-amber-500', pct: 'w-2/3' };
    }
    return { score, label: 'Very Strong Password', color: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]', text: 'text-emerald-500', pct: 'w-full' };
  };

  const strength = getPasswordStrength(password);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signUpWithEmail(fullName, email, password, phone);

      toast({
        title: 'Account Created Successfully!',
        description: "Welcome to Dristi AI. You have been registered and logged in.",
      });

      router.push('/user/dashboard');
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error
          ? String((error as { code: string }).code)
          : 'unknown';
      toast({
        title: 'Signup Failed',
        description: getAuthErrorMessage(code),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: 'Real-time AI Feed Monitoring',
      description: 'Ultralytics YOLOv8 powered instant crowd density analysis and anomaly warnings.',
      icon: Cpu,
      color: 'from-blue-500/25 to-cyan-500/5',
      accent: 'text-blue-400'
    },
    {
      title: 'Intelligent Congestion Alerts',
      description: 'Automatic warnings sent directly to operators and emergency dispatch.',
      icon: Activity,
      color: 'from-cyan-500/25 to-emerald-500/5',
      accent: 'text-cyan-400'
    },
    {
      title: 'Dristi Guard Dispatch',
      description: 'Streamlined security management and immediate location tracking for rapid response.',
      icon: Sparkles,
      color: 'from-purple-500/25 to-pink-500/5',
      accent: 'text-purple-400'
    }
  ];

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-background select-none">


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

      {/* Floating Sparkles / Particle System - static values to avoid hydration mismatch */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        {[
          { w: 4, h: 4, l: 8, t: 20, dur: 9, delay: 0 },
          { w: 2, h: 2, l: 18, t: 60, dur: 12, delay: 1.5 },
          { w: 3, h: 3, l: 30, t: 35, dur: 8, delay: 3 },
          { w: 5, h: 5, l: 42, t: 75, dur: 11, delay: 0.8 },
          { w: 2, h: 2, l: 55, t: 15, dur: 14, delay: 2.2 },
          { w: 4, h: 4, l: 65, t: 55, dur: 10, delay: 4 },
          { w: 3, h: 3, l: 74, t: 30, dur: 7, delay: 1 },
          { w: 2, h: 2, l: 82, t: 80, dur: 13, delay: 5 },
          { w: 5, h: 5, l: 90, t: 45, dur: 9, delay: 2 },
          { w: 3, h: 3, l: 12, t: 85, dur: 11, delay: 3.5 },
          { w: 2, h: 2, l: 48, t: 22, dur: 8, delay: 0.5 },
          { w: 4, h: 4, l: 60, t: 68, dur: 12, delay: 1.8 },
          { w: 3, h: 3, l: 25, t: 50, dur: 10, delay: 4.5 },
          { w: 2, h: 2, l: 78, t: 12, dur: 9, delay: 2.8 },
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
            <h2 className="text-3xl font-extrabold tracking-tight">
              Create an account
              <span className="block text-muted-foreground text-lg font-normal mt-1">
                Start guarding your crowd operations
              </span>
            </h2>
          </div>

          {/* Fully Interactive Feature Carousel */}
          <div className="space-y-3">
            {features.map((feature, idx) => {
              const IconComp = feature.icon;
              const isActive = activeFeature === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveFeature(idx)}
                  className={cn(
                    'flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-300',
                    isActive 
                      ? 'border-primary/50 bg-gradient-to-r ' + feature.color + ' shadow-[0_4px_20px_rgba(59,130,246,0.1)] scale-[1.02]' 
                      : 'border-border/40 bg-card/10 hover:bg-card/25 hover:border-border/80'
                  )}
                >
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300',
                    isActive ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted border-border/30 text-muted-foreground'
                  )}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className={cn('text-sm font-semibold transition-colors', isActive ? feature.accent : 'text-foreground')}>{feature.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
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

      {/* Right Column - Signup Form */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto z-10">
        
        {/* Floating Mobile Logo Header */}
        <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
          <div className="relative h-16 w-36 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <img src="/logo.jpg" alt="Dristi AI" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400 animate-scan pointer-events-none" />
          </div>
          <span className="text-sm font-semibold tracking-wider text-cyan-400 mt-1">DRISTI AI</span>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:text-left space-y-1.5">
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-white/70 bg-clip-text">
              Sign Up
            </h2>
            <p className="text-sm text-muted-foreground">
              Register as an event attendee to begin real-time reporting
            </p>
          </div>

          {/* Form Container with High-End Glassmorphism */}
          <div className="rounded-2xl border border-white/[0.08] bg-card/45 p-6 backdrop-blur-xl shadow-2xl shadow-black/40 space-y-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </Label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 bg-black/20 border-white/10 pl-11 pr-4 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/80 transition-all rounded-lg"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </Label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="yourname@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 bg-black/20 border-white/10 pl-11 pr-4 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/80 transition-all rounded-lg"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone Number
                </Label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Phone className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 bg-black/20 border-white/10 pl-11 pr-4 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/80 transition-all rounded-lg"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <span className={cn('text-[10px] font-mono tracking-wider font-semibold transition-all duration-300', strength.text)}>
                    {strength.label}
                  </span>
                </div>
                
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="h-11 bg-black/20 border-white/10 pl-11 pr-10 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/80 transition-all rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>

                {/* Micro-interactive Password Strength Bar */}
                <div className="w-full h-1 bg-black/40 rounded-full mt-2 overflow-hidden">
                  <div className={cn('h-full transition-all duration-500 ease-out', strength.color, strength.pct)} />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-bold tracking-wider uppercase mt-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-[size:200%_auto] hover:bg-right transition-all duration-500 shadow-lg shadow-blue-500/20 active:scale-[0.98] rounded-lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Registering Account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>
            </form>

            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">
                  Log in
                </Link>
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all rounded-lg">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

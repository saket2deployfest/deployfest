'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { useAuth } from "@/contexts/auth-context";
import { UserProfileProvider } from "@/hooks/use-user-profile";
import { Loader2 } from "lucide-react";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "user") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "user") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <UserProfileProvider>
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
            <Header />
            <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">{children}</main>
        </div>
    </UserProfileProvider>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { isAuthenticated, userID, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-foreground/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Task Manager</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground/60">
              {userID?.slice(0, 8)}...
            </span>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="text-sm px-3 py-1 border border-foreground/20 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-foreground/60 mt-1">
              Welcome to Task Manager
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border border-foreground/10 rounded-xl">
              <h3 className="text-sm font-medium text-foreground/60">
                Total Tasks
              </h3>
              <p className="text-3xl font-bold mt-2">0</p>
            </div>
            <div className="p-6 border border-foreground/10 rounded-xl">
              <h3 className="text-sm font-medium text-foreground/60">
                In Progress
              </h3>
              <p className="text-3xl font-bold mt-2">0</p>
            </div>
            <div className="p-6 border border-foreground/10 rounded-xl">
              <h3 className="text-sm font-medium text-foreground/60">
                Completed
              </h3>
              <p className="text-3xl font-bold mt-2">0</p>
            </div>
          </div>

          <div className="p-6 border border-foreground/10 rounded-xl">
            <h3 className="font-medium mb-4">Recent Activity</h3>
            <p className="text-foreground/40 text-sm">
              No tasks yet. Start by creating your first task.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

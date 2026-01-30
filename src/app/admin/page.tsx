import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  // Get some basic stats
  const [
    userCount,
    challengeCount,
    feedbackCount,
    pendingFeedbackCount,
  ] = await Promise.all([
    db.user.count(),
    db.challenge.count(),
    db.feedback.count(),
    db.feedback.count({ where: { status: "pending" } }),
  ]);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Manage your application
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-3xl font-bold text-white">{userCount}</div>
            <div className="text-sm text-slate-400">Total Users</div>
          </Card>
          <Card className="p-4">
            <div className="text-3xl font-bold text-white">{challengeCount}</div>
            <div className="text-sm text-slate-400">Challenges</div>
          </Card>
          <Card className="p-4">
            <div className="text-3xl font-bold text-white">{feedbackCount}</div>
            <div className="text-sm text-slate-400">Feedback</div>
          </Card>
          <Card className="p-4">
            <div className="text-3xl font-bold text-amber-400">{pendingFeedbackCount}</div>
            <div className="text-sm text-slate-400">Pending Feedback</div>
          </Card>
        </div>

        {/* Admin Sections */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/admin/feedback">
            <Card className="p-6 hover:border-amber-500/50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl">
                  💬
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">
                    Feedback Management
                  </h3>
                  <p className="text-sm text-slate-400">
                    Review user feedback and feature requests
                  </p>
                  {pendingFeedbackCount > 0 && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                      {pendingFeedbackCount} pending
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="p-6 hover:border-amber-500/50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-2xl">
                  👥
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">
                    User Management
                  </h3>
                  <p className="text-sm text-slate-400">
                    View all users and their activity
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                    {userCount} users
                  </span>
                </div>
              </div>
            </Card>
          </Link>

          <Card className="p-6 opacity-50 cursor-not-allowed">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-2xl">
                🎯
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Challenge Management
                </h3>
                <p className="text-sm text-slate-400">
                  Coming soon...
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 opacity-50 cursor-not-allowed">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Analytics
                </h3>
                <p className="text-sm text-slate-400">
                  Coming soon...
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

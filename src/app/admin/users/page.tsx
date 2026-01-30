import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  // Get all users with their activity stats
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      username: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          challenges: true,
          challengeMembers: true,
          dailyCheckins: true,
          comments: true,
          reactions: true,
          books: true,
          feedback: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get recent activity for each user
  const usersWithActivity = await Promise.all(
    users.map(async (u) => {
      const lastCheckin = await db.dailyCheckin.findFirst({
        where: { userId: u.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      const activeChallengeMemberships = await db.challengeMember.count({
        where: {
          userId: u.id,
          status: "active",
          challenge: {
            endDate: { gte: new Date() },
          },
        },
      });

      return {
        ...u,
        lastActivity: lastCheckin?.createdAt || u.createdAt,
        activeChallenges: activeChallengeMemberships,
      };
    })
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return formatDate(date);
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/admin"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                User Management
              </h1>
            </div>
            <p className="text-slate-400">
              View all users and their activity
            </p>
          </div>
          <div className="text-sm text-slate-400">
            Total: <span className="text-white font-medium">{users.length}</span> users
          </div>
        </div>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left p-4 text-sm font-medium text-slate-300">User</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Role</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-300">Challenges</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-300">Check-ins</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-300">Comments</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-300">Books</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Last Active</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Joined</th>
                </tr>
              </thead>
              <tbody>
                {usersWithActivity.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    {/* User Info */}
                    <td className="p-4">
                      <Link href={`/profile/${u.id}`} className="flex items-center gap-3 hover:opacity-80">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.fullName || "User"}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold">
                            {(u.fullName || u.email || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{u.fullName || "No name"}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                          {u.username && (
                            <p className="text-xs text-slate-500">@{u.username}</p>
                          )}
                        </div>
                      </Link>
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        u.role === "admin" 
                          ? "bg-red-500/20 text-red-400" 
                          : "bg-slate-700 text-slate-300"
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Challenges */}
                    <td className="p-4 text-center">
                      <div className="text-white font-medium">{u._count.challengeMembers}</div>
                      <div className="text-xs text-slate-500">{u.activeChallenges} active</div>
                    </td>

                    {/* Check-ins */}
                    <td className="p-4 text-center">
                      <div className="text-white font-medium">{u._count.dailyCheckins}</div>
                    </td>

                    {/* Comments */}
                    <td className="p-4 text-center">
                      <div className="text-white font-medium">{u._count.comments}</div>
                    </td>

                    {/* Books */}
                    <td className="p-4 text-center">
                      <div className="text-white font-medium">{u._count.books}</div>
                    </td>

                    {/* Last Active */}
                    <td className="p-4">
                      <span className="text-sm text-slate-400">{formatTimeAgo(u.lastActivity)}</span>
                    </td>

                    {/* Joined */}
                    <td className="p-4">
                      <span className="text-sm text-slate-400">{formatDate(u.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Activity Summary */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Most Active Users</h3>
            <div className="space-y-2">
              {[...usersWithActivity]
                .sort((a, b) => b._count.dailyCheckins - a._count.dailyCheckins)
                .slice(0, 5)
                .map((u) => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold">
                          {(u.fullName || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-white">{u.fullName || u.email}</span>
                    </div>
                    <span className="text-xs text-amber-400">{u._count.dailyCheckins} check-ins</span>
                  </Link>
                ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Challenge Creators</h3>
            <div className="space-y-2">
              {[...usersWithActivity]
                .sort((a, b) => b._count.challenges - a._count.challenges)
                .filter((u) => u._count.challenges > 0)
                .slice(0, 5)
                .map((u) => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold">
                          {(u.fullName || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-white">{u.fullName || u.email}</span>
                    </div>
                    <span className="text-xs text-emerald-400">{u._count.challenges} created</span>
                  </Link>
                ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Recent Sign-ups</h3>
            <div className="space-y-2">
              {usersWithActivity.slice(0, 5).map((u) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold">
                        {(u.fullName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-white">{u.fullName || u.email}</span>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(u.createdAt)}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

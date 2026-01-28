import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getAllUsersAdmin, getAdminStats, isAdmin } from "@/actions/admin";
import { Card } from "@/components/ui/card";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const admin = await isAdmin();
  if (!admin) redirect("/dashboard");

  const [stats, users] = await Promise.all([
    getAdminStats(),
    getAllUsersAdmin(),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-400">Manage users and view platform activity</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-violet-500/30">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-1">{stats.totalUsers}</div>
                <div className="text-slate-400">Total Users</div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-1">{stats.totalChallenges}</div>
                <div className="text-slate-400">Total Challenges</div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-500/30">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-1">{stats.totalCheckins}</div>
                <div className="text-slate-400">Total Check-ins</div>
              </div>
            </Card>
          </div>
        )}

        {/* Users Table */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Registered Users</h2>
            <span className="text-sm text-slate-400">{users.length} users</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">User</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Role</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Challenges</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Check-ins</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Joined</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold">
                            {(u.fullName || u.username || u.email)[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white">
                            {u.fullName || u.username || "No name"}
                          </div>
                          {u.username && (
                            <div className="text-sm text-slate-500">@{u.username}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{u.email}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-300">
                      {u.stats.activeChallenges}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-300">
                      {u.stats.totalCheckins}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-sm">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-slate-400">No users registered yet</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

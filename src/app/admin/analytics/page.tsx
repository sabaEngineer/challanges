import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNotificationAnalytics, getSessionAnalytics, getVisitorAnalytics } from "@/actions/analytics";
import { Card } from "@/components/ui/card";
import Link from "next/link";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const [notificationData, sessionData, visitorData] = await Promise.all([
    getNotificationAnalytics(),
    getSessionAnalytics(),
    getVisitorAnalytics(),
  ]);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-slate-400 hover:text-white text-sm mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-slate-400 mt-1">
            User engagement and notification metrics
          </p>
        </div>

        {/* Notification Analytics */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔔</span> Notification Analytics
          </h2>
          
          {notificationData.error ? (
            <Card className="p-4 text-red-400">{notificationData.error}</Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="text-3xl font-bold text-emerald-400">
                  {notificationData.data?.totalEnabled || 0}
                </div>
                <div className="text-sm text-slate-400">Users with Notifications Enabled</div>
              </Card>
              
              {notificationData.data?.enablesByDevice.map((item) => (
                <Card key={item.device} className="p-4">
                  <div className="text-3xl font-bold text-white">{item.count}</div>
                  <div className="text-sm text-slate-400">
                    Enabled on {item.device === "ios" ? "iOS" : item.device === "android" ? "Android" : "Desktop"}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Users who dismissed most */}
          {notificationData.data?.userDismissCounts && notificationData.data.userDismissCounts.length > 0 && (
            <Card className="p-4">
              <h3 className="text-lg font-medium text-white mb-4">Users Who Dismissed "Maybe Later"</h3>
              <div className="space-y-3">
                {notificationData.data.userDismissCounts.map((item) => (
                  <div key={item.user?.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {item.user?.avatarUrl ? (
                        <img src={item.user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">
                          {item.user?.fullName?.[0] || "?"}
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium">
                          {item.user?.fullName || item.user?.username || "Unknown"}
                        </div>
                        {item.user?.username && (
                          <div className="text-xs text-slate-400">@{item.user.username}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-amber-400 font-semibold">
                      {item.dismissCount} times
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>

        {/* Session Analytics */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>⏱️</span> Session Analytics
          </h2>
          
          {sessionData.error ? (
            <Card className="p-4 text-red-400">{sessionData.error}</Card>
          ) : (
            <>
              {/* Sessions by device */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {sessionData.data?.sessionsByDevice.map((item) => (
                  <Card key={item.device} className="p-4">
                    <div className="text-3xl font-bold text-white">{item.sessionCount}</div>
                    <div className="text-sm text-slate-400 mb-2">
                      Sessions on {item.device === "ios" ? "iOS" : item.device === "android" ? "Android" : "Desktop"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Total: {formatDuration(item.totalSeconds)}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Top users by time */}
              {sessionData.data?.topUsersByTime && sessionData.data.topUsersByTime.length > 0 && (
                <Card className="p-4 mb-6">
                  <h3 className="text-lg font-medium text-white mb-4">Top Users by Time Spent</h3>
                  <div className="space-y-3">
                    {sessionData.data.topUsersByTime.map((item, index) => (
                      <div key={item.user?.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          {item.user?.avatarUrl ? (
                            <img src={item.user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">
                              {item.user?.fullName?.[0] || "?"}
                            </div>
                          )}
                          <div>
                            <div className="text-white font-medium">
                              {item.user?.fullName || item.user?.username || "Unknown"}
                            </div>
                            <div className="text-xs text-slate-400">
                              {item.sessionCount} sessions
                            </div>
                          </div>
                        </div>
                        <div className="text-emerald-400 font-semibold">
                          {formatDuration(item.totalSeconds)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Recent sessions */}
              {sessionData.data?.recentSessions && sessionData.data.recentSessions.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-lg font-medium text-white mb-4">Recent Sessions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-700">
                          <th className="pb-2 pr-4">User</th>
                          <th className="pb-2 pr-4">Device</th>
                          <th className="pb-2 pr-4">Started</th>
                          <th className="pb-2 pr-4">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionData.data.recentSessions.slice(0, 20).map((session) => (
                          <tr key={session.id} className="border-b border-slate-800">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                {session.user?.avatarUrl ? (
                                  <img src={session.user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                                    {session.user?.fullName?.[0] || "?"}
                                  </div>
                                )}
                                <span className="text-white">
                                  {session.user?.fullName || session.user?.username || "Unknown"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                session.device === "ios" ? "bg-blue-500/20 text-blue-400" :
                                session.device === "android" ? "bg-green-500/20 text-green-400" :
                                "bg-slate-500/20 text-slate-400"
                              }`}>
                                {session.device === "ios" ? "iOS" : 
                                 session.device === "android" ? "Android" : "Desktop"}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-slate-400">
                              {new Date(session.startedAt).toLocaleString()}
                            </td>
                            <td className="py-3 text-slate-300">
                              {session.durationSec ? formatDuration(session.durationSec) : "Active"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </section>

        {/* Visitor Analytics */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>👥</span> Visitor Analytics
          </h2>
          
          {visitorData.error ? (
            <Card className="p-4 text-red-400">{visitorData.error}</Card>
          ) : (
            <>
              {/* Overview stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                  <div className="text-3xl font-bold text-white">
                    {visitorData.data?.totalVisits || 0}
                  </div>
                  <div className="text-sm text-slate-400">Total Visits</div>
                </Card>
                <Card className="p-4">
                  <div className="text-3xl font-bold text-blue-400">
                    {visitorData.data?.uniqueVisitors || 0}
                  </div>
                  <div className="text-sm text-slate-400">Unique Visitors</div>
                </Card>
                <Card className="p-4">
                  <div className="text-3xl font-bold text-emerald-400">
                    {visitorData.data?.todayVisits || 0}
                  </div>
                  <div className="text-sm text-slate-400">Today&apos;s Visits</div>
                </Card>
                <Card className="p-4">
                  <div className="text-3xl font-bold text-amber-400">
                    {visitorData.data?.todayUniqueVisitors || 0}
                  </div>
                  <div className="text-sm text-slate-400">Today&apos;s Unique</div>
                </Card>
              </div>

              {/* Device, OS, Browser breakdown */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {/* By Device */}
                <Card className="p-4">
                  <h3 className="text-lg font-medium text-white mb-4">By Device</h3>
                  <div className="space-y-3">
                    {visitorData.data?.visitsByDevice.map((item) => (
                      <div key={item.device} className="flex items-center justify-between">
                        <span className="text-slate-300 capitalize flex items-center gap-2">
                          <span className={
                            item.device === "desktop" ? "text-blue-400" :
                            item.device === "mobile" ? "text-green-400" :
                            "text-purple-400"
                          }>
                            {item.device === "desktop" ? "💻" : item.device === "mobile" ? "📱" : "📟"}
                          </span>
                          {item.device}
                        </span>
                        <span className="font-semibold text-white">{item.count}</span>
                      </div>
                    ))}
                    {(!visitorData.data?.visitsByDevice || visitorData.data.visitsByDevice.length === 0) && (
                      <p className="text-slate-500 text-sm">No data yet</p>
                    )}
                  </div>
                </Card>

                {/* By OS */}
                <Card className="p-4">
                  <h3 className="text-lg font-medium text-white mb-4">By OS</h3>
                  <div className="space-y-3">
                    {visitorData.data?.visitsByOS.map((item) => (
                      <div key={item.os} className="flex items-center justify-between">
                        <span className="text-slate-300 capitalize flex items-center gap-2">
                          <span className={
                            item.os === "ios" ? "text-blue-400" :
                            item.os === "android" ? "text-green-400" :
                            item.os === "windows" ? "text-cyan-400" :
                            item.os === "macos" ? "text-slate-300" :
                            "text-orange-400"
                          }>
                            {item.os === "ios" ? "🍎" : 
                             item.os === "android" ? "🤖" : 
                             item.os === "windows" ? "🪟" : 
                             item.os === "macos" ? "🍏" : 
                             item.os === "linux" ? "🐧" : "❓"}
                          </span>
                          {item.os === "ios" ? "iOS" : 
                           item.os === "macos" ? "macOS" : 
                           item.os.charAt(0).toUpperCase() + item.os.slice(1)}
                        </span>
                        <span className="font-semibold text-white">{item.count}</span>
                      </div>
                    ))}
                    {(!visitorData.data?.visitsByOS || visitorData.data.visitsByOS.length === 0) && (
                      <p className="text-slate-500 text-sm">No data yet</p>
                    )}
                  </div>
                </Card>

                {/* By Browser */}
                <Card className="p-4">
                  <h3 className="text-lg font-medium text-white mb-4">By Browser</h3>
                  <div className="space-y-3">
                    {visitorData.data?.visitsByBrowser.map((item) => (
                      <div key={item.browser} className="flex items-center justify-between">
                        <span className="text-slate-300 capitalize flex items-center gap-2">
                          <span className={
                            item.browser === "chrome" ? "text-yellow-400" :
                            item.browser === "safari" ? "text-blue-400" :
                            item.browser === "firefox" ? "text-orange-400" :
                            item.browser === "edge" ? "text-cyan-400" :
                            "text-slate-400"
                          }>
                            {item.browser === "chrome" ? "🌐" : 
                             item.browser === "safari" ? "🧭" : 
                             item.browser === "firefox" ? "🦊" : 
                             item.browser === "edge" ? "🔷" : 
                             item.browser === "samsung" ? "📱" : "🌍"}
                          </span>
                          {item.browser.charAt(0).toUpperCase() + item.browser.slice(1)}
                        </span>
                        <span className="font-semibold text-white">{item.count}</span>
                      </div>
                    ))}
                    {(!visitorData.data?.visitsByBrowser || visitorData.data.visitsByBrowser.length === 0) && (
                      <p className="text-slate-500 text-sm">No data yet</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Last 7 days chart */}
              {visitorData.data?.last7Days && visitorData.data.last7Days.length > 0 && (
                <Card className="p-4 mb-6">
                  <h3 className="text-lg font-medium text-white mb-4">Last 7 Days</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-700">
                          <th className="pb-2 pr-4">Date</th>
                          <th className="pb-2 pr-4">Visits</th>
                          <th className="pb-2">Unique Visitors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitorData.data.last7Days.map((day) => (
                          <tr key={day.date} className="border-b border-slate-800">
                            <td className="py-3 pr-4 text-slate-300">{day.date}</td>
                            <td className="py-3 pr-4 text-white font-medium">{day.visits}</td>
                            <td className="py-3 text-blue-400">{day.uniqueVisitors}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Recent visits */}
              {visitorData.data?.recentVisits && visitorData.data.recentVisits.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-lg font-medium text-white mb-4">Recent Visits</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-700">
                          <th className="pb-2 pr-4">User</th>
                          <th className="pb-2 pr-4">Device</th>
                          <th className="pb-2 pr-4">OS</th>
                          <th className="pb-2 pr-4">Browser</th>
                          <th className="pb-2 pr-4">Page</th>
                          <th className="pb-2">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitorData.data.recentVisits.slice(0, 30).map((visit) => (
                          <tr key={visit.id} className="border-b border-slate-800">
                            <td className="py-3 pr-4">
                              {visit.user ? (
                                <div className="flex items-center gap-2">
                                  {visit.user.avatarUrl ? (
                                    <img src={visit.user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                                      {visit.user.fullName?.[0] || "?"}
                                    </div>
                                  )}
                                  <span className="text-white">
                                    {visit.user.fullName || visit.user.username || "Unknown"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500">Anonymous</span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                visit.deviceType === "mobile" ? "bg-green-500/20 text-green-400" :
                                visit.deviceType === "tablet" ? "bg-purple-500/20 text-purple-400" :
                                "bg-blue-500/20 text-blue-400"
                              }`}>
                                {visit.deviceType}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-slate-300 capitalize">
                                {visit.os === "ios" ? "iOS" : 
                                 visit.os === "macos" ? "macOS" : 
                                 visit.os}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-slate-300 capitalize">{visit.browser}</span>
                            </td>
                            <td className="py-3 pr-4 text-slate-400 max-w-[150px] truncate">
                              {visit.page || "/"}
                            </td>
                            <td className="py-3 text-slate-400 whitespace-nowrap">
                              {new Date(visit.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

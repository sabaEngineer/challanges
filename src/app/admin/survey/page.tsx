import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSurveyResponses, getSurveyStats } from "@/actions/survey";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

// Label mappings for display
const frequencyLabels: Record<string, string> = {
  yes: "Yes, please!",
  several_times: "Several times a day",
  morning: "Morning only",
  evening: "Evening only",
  never: "Never",
};

const styleLabels: Record<string, string> = {
  simple_reminder: "Simple Reminder",
  friendly_character: "Friendly Character",
  aggressive: "Aggressive Motivator",
  other: "Other",
};

const timeLabels: Record<string, string> = {
  morning: "Morning (7-9 AM)",
  afternoon: "Afternoon (12-2 PM)",
  evening: "Evening (6-8 PM)",
  custom: "Custom Time",
};

const motivationLabels: Record<string, string> = {
  streaks: "Streaks",
  social_pressure: "Social Accountability",
  personal_goals: "Personal Goals",
  competition: "Competition",
  rewards: "Rewards & Badges",
};

const reminderLabels: Record<string, string> = {
  every_challenge: "Every Challenge",
  once_daily: "Once Daily",
  twice_daily: "Twice Daily",
  only_missed: "Only When Behind",
};

export default async function SurveyAdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const [responsesResult, statsResult] = await Promise.all([
    getSurveyResponses(),
    getSurveyStats(),
  ]);

  const responses = responsesResult.data || [];
  const stats = statsResult.stats;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-slate-400 hover:text-white text-sm mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Survey Results
          </h1>
          <p className="text-slate-400 mt-1">
            User feedback on notification preferences
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
            <div className="text-sm text-slate-400">Total Responses</div>
          </Card>
          <Card className="p-4">
            <div className="text-3xl font-bold text-emerald-400">{stats?.completed || 0}</div>
            <div className="text-sm text-slate-400">Completed</div>
          </Card>
          <Card className="p-4">
            <div className="text-3xl font-bold text-amber-400">{stats?.dismissed || 0}</div>
            <div className="text-sm text-slate-400">Dismissed</div>
          </Card>
        </div>

        {/* Charts/Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Notification Frequency */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Notification Frequency</h3>
            <div className="space-y-3">
              {stats?.frequency?.map((item: { notificationFrequency: string | null; _count: number }) => (
                <div key={item.notificationFrequency || "null"} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">
                        {item.notificationFrequency ? frequencyLabels[item.notificationFrequency] || item.notificationFrequency : "Not answered"}
                      </span>
                      <span className="text-slate-400">{item._count}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${((item._count / (stats?.completed || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notification Style */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Notification Style</h3>
            <div className="space-y-3">
              {stats?.style?.map((item: { notificationStyle: string | null; _count: number }) => (
                <div key={item.notificationStyle || "null"} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">
                        {item.notificationStyle ? styleLabels[item.notificationStyle] || item.notificationStyle : "Not answered"}
                      </span>
                      <span className="text-slate-400">{item._count}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${((item._count / (stats?.completed || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Preferred Time */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Preferred Time</h3>
            <div className="space-y-3">
              {stats?.time?.map((item: { preferredTime: string | null; _count: number }) => (
                <div key={item.preferredTime || "null"} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">
                        {item.preferredTime ? timeLabels[item.preferredTime] || item.preferredTime : "Not answered"}
                      </span>
                      <span className="text-slate-400">{item._count}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${((item._count / (stats?.completed || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Motivation Type */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Motivation Type</h3>
            <div className="space-y-3">
              {stats?.motivation?.map((item: { motivationType: string | null; _count: number }) => (
                <div key={item.motivationType || "null"} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">
                        {item.motivationType ? motivationLabels[item.motivationType] || item.motivationType : "Not answered"}
                      </span>
                      <span className="text-slate-400">{item._count}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${((item._count / (stats?.completed || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Reminder Frequency */}
          <Card className="p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">Reminder Frequency Preference</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {stats?.reminder?.map((item: { reminderFrequency: string | null; _count: number }) => (
                <div key={item.reminderFrequency || "null"} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">
                        {item.reminderFrequency ? reminderLabels[item.reminderFrequency] || item.reminderFrequency : "Not answered"}
                      </span>
                      <span className="text-slate-400">{item._count}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${((item._count / (stats?.completed || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Individual Responses */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">All Responses ({responses.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-sm font-medium text-slate-400 py-3 px-2">User</th>
                  <th className="text-left text-sm font-medium text-slate-400 py-3 px-2">Frequency</th>
                  <th className="text-left text-sm font-medium text-slate-400 py-3 px-2">Style</th>
                  <th className="text-left text-sm font-medium text-slate-400 py-3 px-2">Time</th>
                  <th className="text-left text-sm font-medium text-slate-400 py-3 px-2">Motivation</th>
                  <th className="text-left text-sm font-medium text-slate-400 py-3 px-2">Feedback</th>
                  <th className="text-left text-sm font-medium text-slate-400 py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((response) => (
                  <tr key={response.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-3 px-2">
                      {response.user ? (
                        <div className="flex items-center gap-2">
                          {response.user.avatarUrl ? (
                            <Image
                              src={response.user.avatarUrl}
                              alt={response.user.fullName || "User"}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                              {(response.user.fullName || response.user.email)?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-white">
                            {response.user.fullName || response.user.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">Anonymous</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-300">
                      {response.notificationFrequency ? frequencyLabels[response.notificationFrequency] || response.notificationFrequency : "-"}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-300">
                      {response.notificationStyle === "other" 
                        ? response.notificationStyleOther || "Other"
                        : response.notificationStyle ? styleLabels[response.notificationStyle] || response.notificationStyle : "-"}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-300">
                      {response.preferredTime === "custom"
                        ? response.customTime || "Custom"
                        : response.preferredTime ? timeLabels[response.preferredTime] || response.preferredTime : "-"}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-300">
                      {response.motivationType ? motivationLabels[response.motivationType] || response.motivationType : "-"}
                    </td>
                    <td className="py-3 px-2">
                      {response.additionalFeedback ? (
                        <div className="max-w-xs">
                          <p className="text-sm text-slate-300 truncate" title={response.additionalFeedback}>
                            {response.additionalFeedback}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-400">
                      {new Date(response.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {responses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No survey responses yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

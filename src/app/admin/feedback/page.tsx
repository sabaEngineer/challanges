import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAllFeedback } from "@/actions/feedback";
import { FeedbackList } from "./feedback-list";
import Link from "next/link";

export default async function AdminFeedbackPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const result = await getAllFeedback();

  if (result.error) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-white mb-2">Error</h3>
            <p className="text-slate-400">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const feedback = result.feedback || [];

  // Group feedback by status
  const pendingFeedback = feedback.filter((f) => f.status === "pending");
  const reviewedFeedback = feedback.filter((f) => f.status === "reviewed");
  const plannedFeedback = feedback.filter((f) => f.status === "planned");
  const completedFeedback = feedback.filter((f) => f.status === "completed");
  const rejectedFeedback = feedback.filter((f) => f.status === "rejected");

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Feedback Management
              </h1>
            </div>
            <p className="text-slate-400">
              Review and manage user feedback and feature requests
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-400">
              Total: <span className="text-white font-medium">{feedback.length}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-amber-400">{pendingFeedback.length}</div>
            <div className="text-sm text-slate-400">Pending</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">{reviewedFeedback.length}</div>
            <div className="text-sm text-slate-400">Reviewed</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-400">{plannedFeedback.length}</div>
            <div className="text-sm text-slate-400">Planned</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-400">{completedFeedback.length}</div>
            <div className="text-sm text-slate-400">Completed</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-400">{rejectedFeedback.length}</div>
            <div className="text-sm text-slate-400">Rejected</div>
          </div>
        </div>

        {/* Feedback List */}
        {feedback.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-16 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Feedback Yet</h3>
            <p className="text-slate-400">
              Users haven't submitted any feedback yet.
            </p>
          </div>
        ) : (
          <FeedbackList feedback={feedback} />
        )}
      </div>
    </div>
  );
}

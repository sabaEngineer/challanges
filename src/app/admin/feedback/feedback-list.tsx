"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateFeedbackStatus, deleteFeedback, type FeedbackStatus, type FeedbackType } from "@/actions/feedback";
import Link from "next/link";

interface FeedbackItem {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  adminNote: string | null;
  createdAt: Date;
  user: {
    id: string;
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

interface FeedbackListProps {
  feedback: FeedbackItem[];
}

const STATUS_OPTIONS: { value: FeedbackStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "bg-amber-500/20 text-amber-400" },
  { value: "reviewed", label: "Reviewed", color: "bg-blue-500/20 text-blue-400" },
  { value: "planned", label: "Planned", color: "bg-purple-500/20 text-purple-400" },
  { value: "completed", label: "Completed", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/20 text-red-400" },
];

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  feature: { label: "Feature", emoji: "✨" },
  bug: { label: "Bug", emoji: "🐛" },
  improvement: { label: "Improvement", emoji: "💡" },
  other: { label: "Other", emoji: "💬" },
};

export function FeedbackList({ feedback: initialFeedback }: FeedbackListProps) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [filter, setFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<string>("");
  const [updating, setUpdating] = useState<string | null>(null);

  const filteredFeedback = feedback.filter((f) => {
    if (filter !== "all" && f.status !== filter) return false;
    if (typeFilter !== "all" && f.type !== typeFilter) return false;
    return true;
  });

  const handleStatusUpdate = async (id: string, status: FeedbackStatus) => {
    setUpdating(id);
    const result = await updateFeedbackStatus(id, status, adminNote || undefined);
    if (result.success) {
      setFeedback((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status, adminNote: adminNote || f.adminNote } : f
        )
      );
      setExpandedId(null);
      setAdminNote("");
    }
    setUpdating(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    
    setUpdating(id);
    const result = await deleteFeedback(id);
    if (result.success) {
      setFeedback((prev) => prev.filter((f) => f.id !== id));
    }
    setUpdating(null);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Status:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">All</option>
            <option value="feature">Feature</option>
            <option value="bug">Bug</option>
            <option value="improvement">Improvement</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="text-sm text-slate-400">
          Showing {filteredFeedback.length} of {feedback.length}
        </div>
      </div>

      {/* Feedback Items */}
      {filteredFeedback.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-400">No feedback matches your filters</p>
        </Card>
      ) : (
        filteredFeedback.map((item) => {
          const statusOption = STATUS_OPTIONS.find((s) => s.value === item.status);
          const typeInfo = TYPE_LABELS[item.type] || TYPE_LABELS.other;
          const isExpanded = expandedId === item.id;

          return (
            <Card key={item.id} className="overflow-hidden">
              {/* Header */}
              <div
                className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <Link href={`/profile/${item.user.id}`} className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {item.user.avatarUrl ? (
                      <img
                        src={item.user.avatarUrl}
                        alt={item.user.fullName || "User"}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold">
                        {(item.user.fullName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                        {typeInfo.emoji} {typeInfo.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusOption?.color}`}>
                        {statusOption?.label}
                      </span>
                    </div>
                    <h3 className="text-white font-medium">{item.title}</h3>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>{item.user.fullName || item.user.email}</span>
                      <span>•</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-700">
                  {/* Full Content */}
                  <div className="mt-4 bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-300 whitespace-pre-wrap">{item.content}</p>
                  </div>

                  {/* Existing Admin Note */}
                  {item.adminNote && (
                    <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                      <p className="text-xs text-amber-400 font-medium mb-1">Admin Note:</p>
                      <p className="text-slate-300 text-sm">{item.adminNote}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 space-y-4">
                    {/* Admin Note Input */}
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Add/Update Admin Note</label>
                      <textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Add a note about this feedback..."
                        rows={2}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                      />
                    </div>

                    {/* Status Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((status) => (
                        <Button
                          key={status.value}
                          variant={item.status === status.value ? "primary" : "outline"}
                          size="sm"
                          onClick={() => handleStatusUpdate(item.id, status.value)}
                          disabled={updating === item.id}
                        >
                          {status.label}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={updating === item.id}
                        className="text-red-400 hover:text-red-300 hover:border-red-500/50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

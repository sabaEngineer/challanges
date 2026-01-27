"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/actions/notifications";
import { acceptInvitation, rejectInvitation } from "@/actions/members";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  challengeId?: string | null;
  checkinId?: string | null;
  bookId?: string | null;
  challenge?: {
    id: string;
    title: string;
    imageUrl?: string | null;
  } | null;
  book?: {
    id: string;
    title: string;
    coverUrl?: string | null;
  } | null;
}

interface NotificationsListProps {
  initialNotifications: Notification[];
}

export function NotificationsList({ initialNotifications }: NotificationsListProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  async function handleMarkAsRead(notificationId: string) {
    startTransition(async () => {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    });
  }

  async function handleMarkAllAsRead() {
    startTransition(async () => {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  }

  async function handleDelete(notificationId: string) {
    startTransition(async () => {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    });
  }

  async function handleAcceptInvitation(challengeId: string, notificationId: string) {
    startTransition(async () => {
      const result = await acceptInvitation(challengeId);
      if (result.success) {
        await deleteNotification(notificationId);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    });
  }

  async function handleRejectInvitation(challengeId: string, notificationId: string) {
    startTransition(async () => {
      const result = await rejectInvitation(challengeId);
      if (result.success) {
        await deleteNotification(notificationId);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    });
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "challenge_invitation":
        return "📨";
      case "invitation_accepted":
        return "✅";
      case "invitation_rejected":
        return "❌";
      case "challenge_started":
        return "🚀";
      case "challenge_ended":
        return "🏁";
      case "new_comment":
        return "💬";
      case "comment_reply":
        return "↩️";
      case "member_checkin":
        return "✓";
      case "book_request":
        return "📚";
      case "book_request_accepted":
        return "✅";
      case "book_request_rejected":
        return "❌";
      case "book_returned":
        return "📥";
      default:
        return "🔔";
    }
  }

  function formatTime(date: Date) {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === "all"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === "unread"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications list */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </h3>
          <p className="text-slate-400">
            {filter === "unread"
              ? "You're all caught up!"
              : "When you receive notifications, they'll appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-5 rounded-xl border transition-all ${
                notification.read
                  ? "bg-slate-900/30 border-slate-800"
                  : "bg-slate-900 border-amber-500/30 shadow-lg shadow-amber-500/5"
              }`}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 text-3xl">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-white">
                        {notification.title}
                      </h3>
                      <p className="text-slate-400 mt-1">{notification.message}</p>
                      <p className="text-slate-500 text-sm mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={isPending}
                          className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                          title="Mark as read"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        disabled={isPending}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                        title="Delete notification"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Action buttons for invitations */}
                  {notification.type === "challenge_invitation" &&
                    notification.challengeId && (
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() =>
                            handleAcceptInvitation(
                              notification.challengeId!,
                              notification.id
                            )
                          }
                          disabled={isPending}
                          className="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                          Accept Invitation
                        </button>
                        <button
                          onClick={() =>
                            handleRejectInvitation(
                              notification.challengeId!,
                              notification.id
                            )
                          }
                          disabled={isPending}
                          className="px-4 py-2 text-sm font-medium bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <Link
                          href={`/challenges/${notification.challengeId}`}
                          className="px-4 py-2 text-sm font-medium bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                          View Challenge
                        </Link>
                      </div>
                    )}

                  {/* View link for comment notifications */}
                  {(notification.type === "new_comment" || notification.type === "comment_reply") && 
                    notification.checkinId && (
                    <Link
                      href={`/feed/${notification.checkinId}`}
                      onClick={() => {
                        if (!notification.read) {
                          handleMarkAsRead(notification.id);
                        }
                      }}
                      className="inline-block mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      View Post →
                    </Link>
                  )}

                  {/* View link for book notifications */}
                  {(notification.type === "book_request" ||
                    notification.type === "book_request_accepted" ||
                    notification.type === "book_request_rejected" ||
                    notification.type === "book_returned") &&
                    notification.bookId && (
                      <Link
                        href={`/books/${notification.bookId}`}
                        onClick={() => {
                          if (!notification.read) {
                            handleMarkAsRead(notification.id);
                          }
                        }}
                        className="inline-block mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        View Book →
                      </Link>
                    )}

                  {/* View link for other notification types */}
                  {notification.type !== "challenge_invitation" &&
                    notification.type !== "new_comment" &&
                    notification.type !== "comment_reply" &&
                    notification.type !== "book_request" &&
                    notification.type !== "book_request_accepted" &&
                    notification.type !== "book_request_rejected" &&
                    notification.type !== "book_returned" &&
                    notification.challengeId && (
                      <Link
                        href={`/challenges/${notification.challengeId}`}
                        onClick={() => {
                          if (!notification.read) {
                            handleMarkAsRead(notification.id);
                          }
                        }}
                        className="inline-block mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        View Challenge →
                      </Link>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


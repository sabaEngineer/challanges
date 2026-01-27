"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification 
} from "@/actions/notifications";
import { acceptInvitation, rejectInvitation } from "@/actions/members";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  challengeId?: string | null;
  checkinId?: string | null;
  challenge?: {
    id: string;
    title: string;
    imageUrl?: string | null;
  } | null;
}

interface NotificationsDropdownProps {
  initialCount: number;
}

export function NotificationsDropdown({ initialCount }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      loadNotifications();
    }
  }, [isOpen]);

  async function loadNotifications() {
    setIsLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    startTransition(async () => {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });
  }

  async function handleMarkAllAsRead() {
    startTransition(async () => {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    });
  }

  async function handleDelete(notificationId: string) {
    startTransition(async () => {
      const notification = notifications.find((n) => n.id === notificationId);
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });
  }

  async function handleAcceptInvitation(challengeId: string, notificationId: string) {
    startTransition(async () => {
      const result = await acceptInvitation(challengeId);
      if (result.success) {
        await handleDelete(notificationId);
      }
    });
  }

  async function handleRejectInvitation(challengeId: string, notificationId: string) {
    startTransition(async () => {
      const result = await rejectInvitation(challengeId);
      if (result.success) {
        await handleDelete(notificationId);
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
    return new Date(date).toLocaleDateString();
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isPending}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3">🔔</div>
                <p className="text-slate-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors ${
                      notification.read
                        ? "bg-transparent"
                        : "bg-slate-800/30 border-l-2 border-amber-400"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-white text-sm">
                            {notification.title}
                          </p>
                          <button
                            onClick={() => handleDelete(notification.id)}
                            disabled={isPending}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">
                          {notification.message}
                        </p>
                        <p className="text-slate-500 text-xs mt-2">
                          {formatTime(notification.createdAt)}
                        </p>

                        {/* Action buttons for invitation notifications */}
                        {notification.type === "challenge_invitation" &&
                          notification.challengeId && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() =>
                                  handleAcceptInvitation(
                                    notification.challengeId!,
                                    notification.id
                                  )
                                }
                                disabled={isPending}
                                className="flex-1 px-3 py-1.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() =>
                                  handleRejectInvitation(
                                    notification.challengeId!,
                                    notification.id
                                  )
                                }
                                disabled={isPending}
                                className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                              >
                                Decline
                              </button>
                              <Link
                                href={`/challenges/${notification.challengeId}`}
                                onClick={() => setIsOpen(false)}
                                className="px-3 py-1.5 text-xs font-medium bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                              >
                                View
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
                                setIsOpen(false);
                              }}
                              className="inline-block mt-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                            >
                              View Post →
                            </Link>
                          )}

                        {/* View link for other notification types */}
                        {notification.type !== "challenge_invitation" &&
                          notification.type !== "new_comment" &&
                          notification.type !== "comment_reply" &&
                          notification.challengeId && (
                            <Link
                              href={`/challenges/${notification.challengeId}`}
                              onClick={() => {
                                if (!notification.read) {
                                  handleMarkAsRead(notification.id);
                                }
                                setIsOpen(false);
                              }}
                              className="inline-block mt-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
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

          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/50">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


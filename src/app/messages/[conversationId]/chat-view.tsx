"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getMessages, sendMessage, markConversationRead } from "@/actions/messages";
import { getUploadUrl } from "@/actions/media";

interface MediaItem {
  url: string;
  type: "image" | "video";
}

interface MessageData {
  id: string;
  content: string | null;
  mediaUrls: MediaItem[] | null;
  sender: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  isOwn: boolean;
  createdAt: Date;
}

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  otherUser: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
}

const EMOJI_LIST = [
  "😀", "😂", "🥹", "😍", "🤩", "😎", "🥳", "😊",
  "💪", "🔥", "⭐", "🎉", "👏", "🙌", "💯", "❤️",
  "🏆", "🎯", "✨", "🚀", "💥", "👍", "🤝", "🙏",
  "😤", "🤔", "😴", "🥺", "😈", "👀", "🫡", "🤣",
];

function formatMessageTime(date: Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateHeader(date: Date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isVideoUrl(url: string) {
  return url.includes("/videos/") ||
    url.toLowerCase().endsWith(".mp4") ||
    url.toLowerCase().endsWith(".mov") ||
    url.toLowerCase().endsWith(".webm");
}

export function ChatView({ conversationId, currentUserId, otherUser }: ChatViewProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    const result = await getMessages(conversationId);
    if (result.success && "messages" in result) {
      setMessages(result.messages);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
    markConversationRead(conversationId);
  }, [conversationId, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom("instant");
  }, [messages, scrollToBottom]);

  // Poll for new messages
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getMessages(conversationId);
      if (result.success && "messages" in result) {
        setMessages((prev) => {
          if (result.messages.length !== prev.length) {
            markConversationRead(conversationId);
            return result.messages;
          }
          return prev;
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId]);

  // Close emoji on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    if (showEmoji) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showEmoji]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;

    setNewMessage("");
    setSending(true);

    const result = await sendMessage(conversationId, text);
    if (result.success && "message" in result) {
      setMessages((prev) => [...prev, result.message]);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;

      if (file.size > maxSize) {
        continue;
      }

      try {
        const result = await getUploadUrl(file.type, "messages");
        if (!result.success || !result.presignedUrl || !result.objectUrl) continue;

        await fetch(result.presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        const mediaItem: MediaItem = {
          url: result.objectUrl,
          type: isVideo ? "video" : "image",
        };

        const sendResult = await sendMessage(conversationId, undefined, [mediaItem]);
        if (sendResult.success && "message" in sendResult) {
          setMessages((prev) => [...prev, sendResult.message]);
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: MessageData[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (dateKey !== currentDate) {
      currentDate = dateKey;
      groupedMessages.push({ date: dateKey, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="fixed inset-0 top-14 sm:top-16 flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-lg">
        <Link
          href="/messages"
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <Link href={`/profile/${otherUser.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          {otherUser.avatarUrl ? (
            <img
              src={otherUser.avatarUrl}
              alt={otherUser.fullName || "User"}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold">
              {(otherUser.fullName || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-white truncate text-sm">
              {otherUser.fullName || otherUser.username || "User"}
            </p>
            {otherUser.username && (
              <p className="text-xs text-slate-500">@{otherUser.username}</p>
            )}
          </div>
        </Link>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="text-4xl block mb-3">👋</span>
              <p className="text-slate-400 text-sm">
                Say hello to {otherUser.fullName || otherUser.username}!
              </p>
            </div>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date header */}
              <div className="flex justify-center my-4">
                <span className="px-3 py-1 bg-slate-800/80 rounded-full text-xs text-slate-400">
                  {formatDateHeader(new Date(group.date))}
                </span>
              </div>

              {group.messages.map((msg, idx) => {
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                const showAvatar = !msg.isOwn && (!prevMsg || prevMsg.isOwn);
                const isConsecutive = prevMsg && prevMsg.isOwn === msg.isOwn;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isOwn ? "justify-end" : "justify-start"} ${isConsecutive ? "mt-0.5" : "mt-3"}`}
                  >
                    {/* Other user avatar */}
                    {!msg.isOwn && (
                      <div className="w-7 mr-2 flex-shrink-0">
                        {showAvatar && otherUser.avatarUrl ? (
                          <img
                            src={otherUser.avatarUrl}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : showAvatar ? (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] font-bold">
                            {(otherUser.fullName || "U").charAt(0).toUpperCase()}
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className={`max-w-[75%] ${msg.isOwn ? "items-end" : "items-start"}`}>
                      {/* Media */}
                      {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                        <div className={`mb-1 rounded-2xl overflow-hidden ${msg.isOwn ? "rounded-br-md" : "rounded-bl-md"}`}>
                          {msg.mediaUrls.map((media, mi) => (
                            media.type === "video" ? (
                              <video
                                key={mi}
                                src={media.url}
                                controls
                                className="max-w-full max-h-64 rounded-2xl"
                              />
                            ) : (
                              <img
                                key={mi}
                                src={media.url}
                                alt=""
                                className="max-w-full max-h-64 rounded-2xl object-cover"
                              />
                            )
                          ))}
                        </div>
                      )}

                      {/* Text bubble */}
                      {msg.content && (
                        <div
                          className={`px-3.5 py-2 rounded-2xl text-sm break-words ${
                            msg.isOwn
                              ? "bg-amber-500 text-white rounded-br-md"
                              : "bg-slate-800 text-slate-200 rounded-bl-md"
                          }`}
                        >
                          {msg.content}
                        </div>
                      )}

                      {/* Time */}
                      {!isConsecutive && (
                        <p className={`text-[10px] text-slate-600 mt-1 ${msg.isOwn ? "text-right" : "text-left"}`}>
                          {formatMessageTime(msg.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-800 bg-slate-950/80 backdrop-blur-lg px-3 py-2 safe-area-bottom">
        <div className="flex items-end gap-2">
          {/* Media upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Emoji button */}
          <div className="relative" ref={emojiRef}>
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              <span className="text-lg">😊</span>
            </button>

            {showEmoji && (
              <div className="absolute bottom-12 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-3 w-72 z-50">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setNewMessage((prev) => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Text input */}
          <input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className={`p-2.5 rounded-full flex-shrink-0 transition-all ${
              newMessage.trim()
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "text-slate-600"
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

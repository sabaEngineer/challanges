import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getConversations } from "@/actions/messages";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function formatTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const conversations = await getConversations();

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <p className="text-sm text-slate-400 mt-1">Your conversations</p>
        </div>

        {conversations.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <span className="text-5xl mb-4 block">💬</span>
              <h2 className="text-lg font-semibold text-white mb-2">No conversations yet</h2>
              <p className="text-slate-400 text-sm mb-4">
                Start a conversation by visiting someone&apos;s profile and clicking &quot;Message&quot;
              </p>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Find people
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const other = conv.otherUser;
              if (!other) return null;

              const lastMsg = conv.lastMessage;
              let preview = "No messages yet";
              if (lastMsg) {
                if (lastMsg.content) {
                  preview = lastMsg.content.length > 60
                    ? lastMsg.content.slice(0, 60) + "..."
                    : lastMsg.content;
                } else if (lastMsg.mediaUrls && Array.isArray(lastMsg.mediaUrls) && lastMsg.mediaUrls.length > 0) {
                  preview = "📎 Media";
                }
              }

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                    conv.hasUnread
                      ? "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10"
                      : "bg-slate-900/50 border-slate-800 hover:bg-slate-800/50"
                  }`}
                >
                  {other.avatarUrl ? (
                    <img
                      src={other.avatarUrl}
                      alt={other.fullName || "User"}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {(other.fullName || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium truncate ${conv.hasUnread ? "text-white" : "text-slate-200"}`}>
                        {other.fullName || other.username || "User"}
                      </span>
                      {lastMsg && (
                        <span className={`text-xs flex-shrink-0 ml-2 ${conv.hasUnread ? "text-amber-400" : "text-slate-500"}`}>
                          {formatTime(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${conv.hasUnread ? "text-slate-200 font-medium" : "text-slate-500"}`}>
                        {lastMsg?.senderId === user.id && <span className="text-slate-500">You: </span>}
                        {preview}
                      </p>
                      {conv.hasUnread && (
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

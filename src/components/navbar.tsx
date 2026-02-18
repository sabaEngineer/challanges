import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationsCount } from "@/actions/notifications";
import { getUnreadMessageCount } from "@/actions/messages";
import { Button } from "./ui/button";
import { NotificationsDropdown } from "./notifications-dropdown";
import { MobileMenu } from "./mobile-menu";

export async function Navbar() {
  const user = await getCurrentUser();
  const [unreadCount, unreadMessages] = user
    ? await Promise.all([getUnreadNotificationsCount(), getUnreadMessageCount()])
    : [0, 0];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl sm:text-2xl">🔥</span>
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Challanges
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/challenges"
              className="text-slate-300 hover:text-white transition-colors text-sm"
            >
              Challenges
            </Link>
            <Link
              href="/leaderboard"
              className="text-slate-300 hover:text-white transition-colors text-sm"
            >
              Leaderboard
            </Link>

            {user ? (
              <>
                <Link
                  href="/feed"
                  className="text-slate-300 hover:text-white transition-colors text-sm"
                >
                  Feed
                </Link>
                <Link
                  href="/books"
                  className="text-slate-300 hover:text-white transition-colors text-sm"
                >
                  Books
                </Link>
                <Link
                  href="/dashboard"
                  className="text-slate-300 hover:text-white transition-colors text-sm"
                >
                  My Activity
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center space-x-3">
                  <Link
                    href="/messages"
                    className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {unreadMessages > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    )}
                  </Link>
                  <NotificationsDropdown initialCount={unreadCount} />
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName || user.username || "User"}
                        className="w-8 h-8 rounded-full ring-2 ring-transparent hover:ring-amber-500/50 transition-all object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-medium">
                        {(user.fullName || user.email || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-slate-400 hidden lg:inline">
                      {user.username ? `@${user.username}` : user.fullName}
                    </span>
                  </Link>
                </div>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm">Sign in with Google</Button>
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex items-center gap-1 md:hidden">
            {user && (
              <>
                <Link
                  href="/messages"
                  className="relative p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>
                <NotificationsDropdown initialCount={unreadCount} />
              </>
            )}
            <MobileMenu
              isLoggedIn={!!user}
              userAvatar={user?.avatarUrl}
              userName={user?.fullName || user?.username}
              userRole={user?.role}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

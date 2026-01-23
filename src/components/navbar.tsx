import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationsCount } from "@/actions/notifications";
import { Button } from "./ui/button";
import { NotificationsDropdown } from "./notifications-dropdown";
import { MobileMenu } from "./mobile-menu";

export async function Navbar() {
  const user = await getCurrentUser();
  const unreadCount = user ? await getUnreadNotificationsCount() : 0;

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
                  href="/dashboard"
                  className="text-slate-300 hover:text-white transition-colors text-sm"
                >
                  My Activity
                </Link>
                <div className="flex items-center space-x-3">
                  <NotificationsDropdown initialCount={unreadCount} />
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName || user.username || "User"}
                        className="w-8 h-8 rounded-full ring-2 ring-transparent hover:ring-amber-500/50 transition-all"
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
          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <NotificationsDropdown initialCount={unreadCount} />
            )}
            <MobileMenu
              isLoggedIn={!!user}
              userAvatar={user?.avatarUrl}
              userName={user?.fullName || user?.username}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

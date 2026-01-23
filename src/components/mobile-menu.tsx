"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";

interface MobileMenuProps {
  isLoggedIn: boolean;
  userAvatar?: string | null;
  userName?: string | null;
}

export function MobileMenu({ isLoggedIn, userAvatar, userName }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-white transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 bg-slate-900 border-b border-slate-800 z-50 animate-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-4 space-y-1">
              {isLoggedIn ? (
                <>
                  {/* User Info */}
                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 mb-4"
                  >
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName || "User"}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg font-medium">
                        {(userName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white">{userName || "User"}</p>
                      <p className="text-xs text-slate-400">View profile</p>
                    </div>
                  </Link>

                  {/* Navigation Links */}
                  <Link
                    href="/feed"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-xl">📰</span>
                    <span className="text-slate-200">Feed</span>
                  </Link>
                  <Link
                    href="/challenges"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-xl">🎯</span>
                    <span className="text-slate-200">Challenges</span>
                  </Link>
                  <Link
                    href="/leaderboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-xl">🏆</span>
                    <span className="text-slate-200">Leaderboard</span>
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-xl">📊</span>
                    <span className="text-slate-200">My Activity</span>
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-xl">🔔</span>
                    <span className="text-slate-200">Notifications</span>
                  </Link>

                  <hr className="border-slate-800 my-2" />

                  <Link
                    href="/challenges/new"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium"
                  >
                    <span>✨</span>
                    <span>Create Challenge</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/challenges"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-xl">🎯</span>
                    <span className="text-slate-200">Challenges</span>
                  </Link>
                  <Link
                    href="/leaderboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-xl">🏆</span>
                    <span className="text-slate-200">Leaderboard</span>
                  </Link>
                  
                  <hr className="border-slate-800 my-2" />

                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="block"
                  >
                    <Button className="w-full">Sign in with Google</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


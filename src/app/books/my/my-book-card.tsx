"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";

interface MyBookCardProps {
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    ownershipType: string;
    lentToUserId: string | null;
    borrower: {
      id: string;
      fullName: string | null;
      username: string | null;
      avatarUrl: string | null;
    } | null;
    requests: {
      id: string;
      requester: {
        id: string;
        fullName: string | null;
        username: string | null;
      };
    }[];
  };
}

export function MyBookCard({ book }: MyBookCardProps) {
  return (
    <Link href={`/books/${book.id}`}>
      <Card className="hover:border-amber-500/50 transition-all cursor-pointer">
        <div className="flex gap-4">
          {/* Cover */}
          <div className="flex-shrink-0 w-16 h-22 rounded-lg overflow-hidden bg-slate-800">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                📖
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{book.title}</h3>
            <p className="text-sm text-slate-400 truncate">{book.author}</p>

            {/* Status */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  book.ownershipType === "physical"
                    ? book.lentToUserId
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-emerald-500/20 text-emerald-400"
                    : book.ownershipType === "digital"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-violet-500/20 text-violet-400"
                }`}
              >
                {book.ownershipType === "physical"
                  ? book.lentToUserId
                    ? "📤 Lent Out"
                    : "📦 Physical"
                  : book.ownershipType === "digital"
                  ? "💻 Digital"
                  : "💡 Recommendation"}
              </span>

              {book.requests.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                  {book.requests.length} request{book.requests.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Lent to */}
            {book.lentToUserId && book.borrower && (
              <p className="text-xs text-orange-400 mt-2">
                Borrowed by{" "}
                {book.borrower.username
                  ? `@${book.borrower.username}`
                  : book.borrower.fullName}
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

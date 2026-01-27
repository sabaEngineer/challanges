import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getBook } from "@/actions/books";
import { BOOK_GENRES } from "@/lib/book-constants";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { BookActions } from "./book-actions";

function getGenreDisplay(code: string | null) {
  if (!code) return null;
  const genre = BOOK_GENRES.find((g) => g.code === code);
  return genre || { code, label: code, emoji: "📕" };
}

interface BookPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const book = await getBook(id);

  if (!book) {
    notFound();
  }

  const pendingRequests = book.requests.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <BackButton />
        </div>

        <Card>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Cover */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-40 h-56 rounded-xl overflow-hidden bg-slate-800 shadow-lg">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">
                    📖
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">{book.title}</h1>
              <p className="text-lg text-slate-400 mb-4">by {book.author}</p>

              {/* Status Badge */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span
                  className={`text-sm px-3 py-1 rounded-full ${
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
                      ? "📤 Currently Lent Out"
                      : "📦 Physical Copy Available"
                    : book.ownershipType === "digital"
                    ? "💻 Digital Copy"
                    : "💡 Recommendation"}
                </span>
                {/* Language Badge */}
                <span className="text-sm px-3 py-1 rounded-full bg-slate-700 text-slate-300">
                  {book.language === "all" ? "🌍 All Languages" :
                   book.language === "en" ? "🇬🇧 English" :
                   book.language === "ka" ? "🇬🇪 Georgian" :
                   book.language === "ru" ? "🇷🇺 Russian" :
                   book.language === "de" ? "🇩🇪 German" :
                   book.language === "fr" ? "🇫🇷 French" :
                   book.language === "es" ? "🇪🇸 Spanish" :
                   book.language === "it" ? "🇮🇹 Italian" :
                   "📚 Other"}
                </span>
                {/* Genre Badge */}
                {book.genre && (() => {
                  const genreInfo = getGenreDisplay(book.genre);
                  return genreInfo ? (
                    <Link 
                      href={`/books?genre=${book.genre}`}
                      className="text-sm px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                    >
                      {genreInfo.emoji} {genreInfo.label}
                    </Link>
                  ) : null;
                })()}
              </div>

              {/* Owner Info */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-slate-800/50 rounded-lg">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700">
                  {book.owner.avatarUrl ? (
                    <img
                      src={book.owner.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      👤
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-400">Shared by</p>
                  <Link
                    href={`/profile/${book.owner.id}`}
                    className="text-white font-medium hover:text-amber-400 transition-colors"
                  >
                    {book.owner.username ? `@${book.owner.username}` : book.owner.fullName}
                  </Link>
                </div>
              </div>

              {/* Lent To Info */}
              {book.lentToUserId && book.borrower && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700">
                    {book.borrower.avatarUrl ? (
                      <img
                        src={book.borrower.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        👤
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-orange-400">Currently borrowed by</p>
                    <Link
                      href={`/profile/${book.borrower.id}`}
                      className="text-white font-medium hover:text-amber-400 transition-colors"
                    >
                      {book.borrower.username ? `@${book.borrower.username}` : book.borrower.fullName}
                    </Link>
                  </div>
                  {book.lentAt && (
                    <span className="ml-auto text-xs text-slate-500">
                      Since {new Date(book.lentAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <BookActions
                bookId={book.id}
                isOwner={book.isOwner}
                ownershipType={book.ownershipType}
                isLent={!!book.lentToUserId}
                hasPendingRequest={book.hasPendingRequest}
                pendingRequestId={book.pendingRequestId}
              />
            </div>
          </div>

          {/* Description */}
          {book.description && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <h2 className="text-lg font-semibold text-white mb-3">About this book</h2>
              <p className="text-slate-300 whitespace-pre-wrap">{book.description}</p>
            </div>
          )}
        </Card>

        {/* Pending Requests (Owner only) */}
        {book.isOwner && pendingRequests.length > 0 && (
          <Card className="mt-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📬</span> Borrow Requests
              <span className="px-2 py-0.5 text-sm rounded-full bg-amber-500/20 text-amber-400">
                {pendingRequests.length}
              </span>
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700">
                    {request.requester.avatarUrl ? (
                      <img
                        src={request.requester.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        👤
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/profile/${request.requester.id}`}
                      className="font-medium text-white hover:text-amber-400 transition-colors"
                    >
                      {request.requester.username
                        ? `@${request.requester.username}`
                        : request.requester.fullName}
                    </Link>
                    {request.message && (
                      <p className="text-sm text-slate-400 mt-1">&quot;{request.message}&quot;</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <BookActions
                    bookId={book.id}
                    isOwner={true}
                    ownershipType={book.ownershipType}
                    isLent={!!book.lentToUserId}
                    requestId={request.id}
                    showRequestActions
                  />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

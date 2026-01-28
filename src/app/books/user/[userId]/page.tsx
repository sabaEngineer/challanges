import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserPublicBooks, getUserForBookList } from "@/actions/books";
import { BOOK_GENRES } from "@/lib/book-constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PublicBookListProps {
  params: Promise<{ userId: string }>;
}

const getLanguageDisplay = (code: string) => {
  const languages: Record<string, { flag: string; label: string }> = {
    all: { flag: "🌍", label: "All Languages" },
    en: { flag: "🇬🇧", label: "English" },
    ka: { flag: "🇬🇪", label: "Georgian" },
    de: { flag: "🇩🇪", label: "German" },
    fr: { flag: "🇫🇷", label: "French" },
    es: { flag: "🇪🇸", label: "Spanish" },
    it: { flag: "🇮🇹", label: "Italian" },
    other: { flag: "📚", label: "Other" },
  };
  return languages[code] || languages.other;
};

const getGenreDisplay = (code: string | null) => {
  if (!code) return null;
  const genre = BOOK_GENRES.find((g) => g.code === code);
  return genre || { code, label: code, emoji: "📕" };
};

export default async function PublicBookListPage({ params }: PublicBookListProps) {
  const { userId } = await params;

  const [user, books] = await Promise.all([
    getUserForBookList(userId),
    getUserPublicBooks(userId),
  ]);

  if (!user) {
    notFound();
  }

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/books/user/${userId}` 
    : `/books/user/${userId}`;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  👤
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">
                {user.username ? `@${user.username}` : user.fullName}&apos;s Books
              </h1>
              <p className="text-slate-400">
                {user._count.books} book{user._count.books !== 1 ? "s" : ""} shared
              </p>
            </div>
            <Link href={`/profile/${userId}`}>
              <Button variant="outline" size="sm">
                View Profile
              </Button>
            </Link>
          </div>
        </Card>

        {/* Books Grid */}
        {books.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-white mb-2">No books yet</h3>
            <p className="text-slate-400">
              This user hasn&apos;t shared any books yet.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books.map((book) => {
              const lang = getLanguageDisplay(book.language);
              const bookGenres = book.genres || [];
              return (
                <Card key={book.id} className="hover:border-slate-600 transition-all">
                  <div className="flex gap-4">
                    {/* Cover */}
                    <div className="flex-shrink-0 w-20 h-28 rounded-lg overflow-hidden bg-slate-800">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          📖
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white">{book.title}</h3>
                      <p className="text-sm text-slate-400">{book.author}</p>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1 mt-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            book.ownershipType === "physical"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : book.ownershipType === "digital"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-violet-500/20 text-violet-400"
                          }`}
                        >
                          {book.ownershipType === "physical"
                            ? "📦 Physical"
                            : book.ownershipType === "digital"
                            ? "💻 Digital"
                            : "💡 Recommendation"}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                          {lang.flag} {lang.label}
                        </span>
                        {bookGenres.map((genreCode) => {
                          const gi = getGenreDisplay(genreCode);
                          return gi ? (
                            <span key={genreCode} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                              {gi.emoji} {gi.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {book.description && (
                    <p className="text-sm text-slate-400 mt-3 line-clamp-3">
                      {book.description}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            This is a public book list. Share it with friends!
          </p>
          <p className="text-slate-600 text-xs mt-2 font-mono">
            {`/books/user/${userId}`}
          </p>
        </div>
      </div>
    </div>
  );
}

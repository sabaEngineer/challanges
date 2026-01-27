import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getAllBooks, getUsedGenres } from "@/actions/books";
import { BOOK_GENRES } from "@/lib/book-constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BooksPageProps {
  searchParams: Promise<{ genre?: string }>;
}

function getGenreInfo(code: string) {
  return BOOK_GENRES.find((g) => g.code === code) || { code, label: code, emoji: "📕" };
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const { genre: selectedGenre } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [books, usedGenres] = await Promise.all([
    getAllBooks(selectedGenre),
    getUsedGenres(),
  ]);

  // Get genre info for genres that have books
  const availableGenres = usedGenres
    .map((code) => getGenreInfo(code))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Books
            </h1>
            <p className="text-slate-400">
              Discover and share book recommendations
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/books/my">
              <Button variant="outline">My Books</Button>
            </Link>
            <Link href="/books/new">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <span className="mr-2">📚</span>
                Add Book
              </Button>
            </Link>
          </div>
        </div>

        {/* Genre Filter */}
        {availableGenres.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <Link href="/books">
                <button
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    !selectedGenre
                      ? "bg-amber-500 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  All Genres
                </button>
              </Link>
              {availableGenres.map((genre) => (
                <Link key={genre.code} href={`/books?genre=${genre.code}`}>
                  <button
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      selectedGenre === genre.code
                        ? "bg-amber-500 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <span className="mr-1">{genre.emoji}</span>
                    {genre.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Active filter indicator */}
        {selectedGenre && (
          <div className="mb-6 flex items-center gap-2">
            <span className="text-slate-400 text-sm">Filtering by:</span>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm flex items-center gap-1">
              {getGenreInfo(selectedGenre).emoji} {getGenreInfo(selectedGenre).label}
              <Link href="/books" className="ml-2 hover:text-amber-300">
                ✕
              </Link>
            </span>
            <span className="text-slate-500 text-sm">
              ({books.length} book{books.length !== 1 ? "s" : ""})
            </span>
          </div>
        )}

        {/* Books Grid */}
        {books.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {selectedGenre ? "No books in this genre" : "No books yet"}
            </h3>
            <p className="text-slate-400 mb-6">
              {selectedGenre
                ? "Be the first to add a book in this category!"
                : "Be the first to share a book recommendation!"}
            </p>
            <Link href="/books/new">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500">
                Add Your First Book
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => {
              const genreInfo = book.genre ? getGenreInfo(book.genre) : null;
              return (
                <Link key={book.id} href={`/books/${book.id}`}>
                  <Card className="h-full hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer">
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
                        <h3 className="font-semibold text-white truncate">{book.title}</h3>
                        <p className="text-sm text-slate-400 truncate">{book.author}</p>
                        
                        {/* Owner */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-700">
                            {book.owner.avatarUrl ? (
                              <img
                                src={book.owner.avatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">
                                👤
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 truncate">
                            {book.owner.username ? `@${book.owner.username}` : book.owner.fullName}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="flex flex-wrap items-center gap-1 mt-2">
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
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                            {book.language === "all" ? "🌍" :
                             book.language === "en" ? "🇬🇧" :
                             book.language === "ka" ? "🇬🇪" :
                             book.language === "ru" ? "🇷🇺" :
                             book.language === "de" ? "🇩🇪" :
                             book.language === "fr" ? "🇫🇷" :
                             book.language === "es" ? "🇪🇸" :
                             book.language === "it" ? "🇮🇹" :
                             "📚"}
                          </span>
                          {genreInfo && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                              {genreInfo.emoji}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description preview */}
                    {book.description && (
                      <p className="text-sm text-slate-400 mt-3 line-clamp-2">
                        {book.description}
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

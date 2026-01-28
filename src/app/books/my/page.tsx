import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMyBooks, getMyBorrowedBooks, getMyBookRequests } from "@/actions/books";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { MyBookCard } from "./my-book-card";

export default async function MyBooksPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [myBooks, borrowedBooks, myRequests] = await Promise.all([
    getMyBooks(),
    getMyBorrowedBooks(),
    getMyBookRequests(),
  ]);

  const pendingRequests = myRequests.filter((r) => r.status === "pending");
  const booksWithPendingRequests = myBooks.filter((b) => b.requests.length > 0);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold text-white">My Books</h1>
              <p className="text-slate-400">Manage your book collection</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/books/user/${user.id}`}>
              <Button variant="outline">
                <span className="mr-2">🔗</span>
                Share Books Publicly
              </Button>
            </Link>
            <Link href="/books/new">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500">
                <span className="mr-2">+</span>
                Add Book
              </Button>
            </Link>
          </div>
        </div>

        {/* Share Suggestion Card */}
        {myBooks.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🔗</div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">Share your book list with friends!</h3>
                <p className="text-sm text-slate-400">
                  Get a public link to your book recommendations that anyone can view
                </p>
              </div>
              <Link href={`/books/user/${user.id}`}>
                <Button size="sm" className="bg-violet-500 hover:bg-violet-600">
                  Get Public Link
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Pending Requests Received */}
        {booksWithPendingRequests.length > 0 && (
          <Card className="mb-6 border-amber-500/30">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📬</span> Borrow Requests
              <span className="px-2 py-0.5 text-sm rounded-full bg-amber-500/20 text-amber-400">
                {booksWithPendingRequests.reduce((acc, b) => acc + b.requests.length, 0)}
              </span>
            </h2>
            <div className="space-y-3">
              {booksWithPendingRequests.map((book) =>
                book.requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
                      {request.requester.avatarUrl ? (
                        <img
                          src={request.requester.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">👤</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white">
                        <Link
                          href={`/profile/${request.requester.id}`}
                          className="font-medium hover:text-amber-400"
                        >
                          {request.requester.username
                            ? `@${request.requester.username}`
                            : request.requester.fullName}
                        </Link>{" "}
                        wants to borrow{" "}
                        <Link href={`/books/${book.id}`} className="font-medium hover:text-amber-400">
                          {book.title}
                        </Link>
                      </p>
                      {request.message && (
                        <p className="text-sm text-slate-400 truncate">&quot;{request.message}&quot;</p>
                      )}
                    </div>
                    <Link href={`/books/${book.id}`}>
                      <Button size="sm">View</Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* My Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>⏳</span> Your Pending Requests
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg"
                >
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                    {request.book.coverUrl ? (
                      <img
                        src={request.book.coverUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">📖</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/books/${request.book.id}`}>
                      <p className="font-medium text-white hover:text-amber-400">
                        {request.book.title}
                      </p>
                    </Link>
                    <p className="text-sm text-slate-400">
                      Requested from{" "}
                      {request.book.owner.username
                        ? `@${request.book.owner.username}`
                        : request.book.owner.fullName}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Currently Borrowed */}
        {borrowedBooks.length > 0 && (
          <Card className="mb-6 border-blue-500/30">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📖</span> Books You&apos;re Borrowing
            </h2>
            <div className="space-y-3">
              {borrowedBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg"
                >
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">📖</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/books/${book.id}`}>
                      <p className="font-medium text-white hover:text-amber-400">{book.title}</p>
                    </Link>
                    <p className="text-sm text-slate-400">by {book.author}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      From {book.owner.username ? `@${book.owner.username}` : book.owner.fullName}
                      {book.lentAt && ` • Since ${new Date(book.lentAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                    Borrowed
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* My Books Collection */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Your Collection</h2>
          {myBooks.length === 0 ? (
            <Card className="text-center py-12">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-slate-400 mb-4">You haven&apos;t added any books yet</p>
              <Link href="/books/new">
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500">
                  Add Your First Book
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myBooks.map((book) => (
                <MyBookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

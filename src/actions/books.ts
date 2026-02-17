"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createNotification } from "./notifications";
import type { ActionResult } from "@/lib/types";

export type BookOwnershipType = "physical" | "digital" | "recommendation";

// Get all books (feed) with optional genre filter
export async function getAllBooks(genre?: string) {
  const books = await db.book.findMany({
    where: genre ? { genres: { has: genre } } : undefined,
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
      borrower: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: { requests: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return books;
}

// Get all unique genres that have books
export async function getUsedGenres() {
  const books = await db.book.findMany({
    where: { genres: { isEmpty: false } },
    select: { genres: true },
  });
  
  // Flatten all genres arrays and get unique values
  const allGenres = books.flatMap((b) => b.genres);
  return [...new Set(allGenres)];
}

// Get user's books
export async function getMyBooks() {
  const user = await getCurrentUser();
  if (!user) return [];

  const books = await db.book.findMany({
    where: { userId: user.id },
    include: {
      borrower: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
      requests: {
        where: { status: "pending" },
        include: {
          requester: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { requests: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return books;
}

// Get books borrowed by current user
export async function getMyBorrowedBooks() {
  const user = await getCurrentUser();
  if (!user) return [];

  const books = await db.book.findMany({
    where: { lentToUserId: user.id },
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { lentAt: "desc" },
  });

  return books;
}

// Get single book details
export async function getBook(bookId: string) {
  const user = await getCurrentUser();

  const book = await db.book.findUnique({
    where: { id: bookId },
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
      borrower: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
      requests: {
        include: {
          requester: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!book) return null;

  // Check if current user has a pending request
  const userPendingRequest = user
    ? book.requests.find((r) => r.requesterId === user.id && r.status === "pending")
    : null;

  return {
    ...book,
    isOwner: user?.id === book.userId,
    hasPendingRequest: !!userPendingRequest,
    pendingRequestId: userPendingRequest?.id,
  };
}

// Add a new book
export async function addBook(data: {
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  language?: string;
  genres?: string[];
  ownershipType: BookOwnershipType;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const book = await db.book.create({
      data: {
        title: data.title,
        author: data.author,
        description: data.description,
        coverUrl: data.coverUrl,
        language: data.language || "all",
        genres: data.genres || [],
        ownershipType: data.ownershipType,
        userId: user.id,
      },
    });

    revalidatePath("/books");
    return { success: true, data: book };
  } catch (error) {
    console.error("Error adding book:", error);
    return { success: false, error: "Failed to add book" };
  }
}

// Update a book
export async function updateBook(
  bookId: string,
  data: {
    title?: string;
    author?: string;
    description?: string;
    coverUrl?: string;
    language?: string;
    genres?: string[];
    ownershipType?: BookOwnershipType;
  }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be logged in" };
  }

  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) {
    return { success: false, error: "Book not found" };
  }
  if (book.userId !== user.id) {
    return { success: false, error: "You can only edit your own books" };
  }

  try {
    await db.book.update({
      where: { id: bookId },
      data,
    });

    revalidatePath("/books");
    revalidatePath(`/books/${bookId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating book:", error);
    return { success: false, error: "Failed to update book" };
  }
}

// Delete a book
export async function deleteBook(bookId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be logged in" };
  }

  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) {
    return { success: false, error: "Book not found" };
  }
  if (book.userId !== user.id) {
    return { success: false, error: "You can only delete your own books" };
  }

  try {
    await db.book.delete({ where: { id: bookId } });

    revalidatePath("/books");
    return { success: true };
  } catch (error) {
    console.error("Error deleting book:", error);
    return { success: false, error: "Failed to delete book" };
  }
}

// Request to borrow a book
export async function requestBook(bookId: string, message?: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be logged in" };
  }

  const book = await db.book.findUnique({
    where: { id: bookId },
    include: { owner: true },
  });

  if (!book) {
    return { success: false, error: "Book not found" };
  }

  if (book.userId === user.id) {
    return { success: false, error: "You can't request your own book" };
  }

  if (book.ownershipType !== "physical") {
    return { success: false, error: "Only physical books can be borrowed" };
  }

  if (book.lentToUserId) {
    return { success: false, error: "This book is currently lent to someone else" };
  }

  // Check for existing pending request
  const existingRequest = await db.bookLendRequest.findFirst({
    where: {
      bookId,
      requesterId: user.id,
      status: "pending",
    },
  });

  if (existingRequest) {
    return { success: false, error: "You already have a pending request for this book" };
  }

  try {
    await db.bookLendRequest.create({
      data: {
        bookId,
        requesterId: user.id,
        message,
      },
    });

    // Notify book owner
    const requesterName = user.username ? `@${user.username}` : user.fullName || "Someone";
    await createNotification({
      userId: book.userId,
      type: "book_request",
      title: "Book Borrow Request",
      message: `${requesterName} wants to borrow "${book.title}"${message ? `: "${message}"` : ""}`,
      bookId: book.id,
    });

    revalidatePath("/books");
    revalidatePath(`/books/${bookId}`);
    return { success: true };
  } catch (error) {
    console.error("Error requesting book:", error);
    return { success: false, error: "Failed to request book" };
  }
}

// Cancel a borrow request
export async function cancelBookRequest(requestId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be logged in" };
  }

  const request = await db.bookLendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (request.requesterId !== user.id) {
    return { success: false, error: "You can only cancel your own requests" };
  }

  if (request.status !== "pending") {
    return { success: false, error: "Can only cancel pending requests" };
  }

  try {
    await db.bookLendRequest.delete({ where: { id: requestId } });

    revalidatePath("/books");
    return { success: true };
  } catch (error) {
    console.error("Error canceling request:", error);
    return { success: false, error: "Failed to cancel request" };
  }
}

// Accept a borrow request (book owner only)
export async function acceptBookRequest(requestId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be logged in" };
  }

  const request = await db.bookLendRequest.findUnique({
    where: { id: requestId },
    include: {
      book: true,
      requester: true,
    },
  });

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (request.book.userId !== user.id) {
    return { success: false, error: "Only the book owner can accept requests" };
  }

  if (request.status !== "pending") {
    return { success: false, error: "This request is no longer pending" };
  }

  if (request.book.lentToUserId) {
    return { success: false, error: "This book is already lent to someone" };
  }

  try {
    // Update request status
    await db.bookLendRequest.update({
      where: { id: requestId },
      data: {
        status: "accepted",
        respondedAt: new Date(),
      },
    });

    // Mark book as lent
    await db.book.update({
      where: { id: request.bookId },
      data: {
        lentToUserId: request.requesterId,
        lentAt: new Date(),
      },
    });

    // Reject all other pending requests for this book
    await db.bookLendRequest.updateMany({
      where: {
        bookId: request.bookId,
        id: { not: requestId },
        status: "pending",
      },
      data: {
        status: "rejected",
        respondedAt: new Date(),
      },
    });

    // Notify requester
    const ownerName = user.username ? `@${user.username}` : user.fullName || "The owner";
    await createNotification({
      userId: request.requesterId,
      type: "book_request_accepted",
      title: "Book Request Accepted",
      message: `${ownerName} accepted your request to borrow "${request.book.title}"`,
      bookId: request.bookId,
    });

    revalidatePath("/books");
    revalidatePath(`/books/${request.bookId}`);
    return { success: true };
  } catch (error) {
    console.error("Error accepting request:", error);
    return { success: false, error: "Failed to accept request" };
  }
}

// Reject a borrow request (book owner only)
export async function rejectBookRequest(requestId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be logged in" };
  }

  const request = await db.bookLendRequest.findUnique({
    where: { id: requestId },
    include: {
      book: true,
      requester: true,
    },
  });

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (request.book.userId !== user.id) {
    return { success: false, error: "Only the book owner can reject requests" };
  }

  if (request.status !== "pending") {
    return { success: false, error: "This request is no longer pending" };
  }

  try {
    await db.bookLendRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        respondedAt: new Date(),
      },
    });

    // Notify requester
    const ownerName = user.username ? `@${user.username}` : user.fullName || "The owner";
    await createNotification({
      userId: request.requesterId,
      type: "book_request_rejected",
      title: "Book Request Declined",
      message: `${ownerName} declined your request to borrow "${request.book.title}"`,
      bookId: request.bookId,
    });

    revalidatePath("/books");
    revalidatePath(`/books/${request.bookId}`);
    return { success: true };
  } catch (error) {
    console.error("Error rejecting request:", error);
    return { success: false, error: "Failed to reject request" };
  }
}

// Mark book as returned (book owner only)
export async function markBookReturned(bookId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be logged in" };
  }

  const book = await db.book.findUnique({
    where: { id: bookId },
    include: { borrower: true },
  });

  if (!book) {
    return { success: false, error: "Book not found" };
  }

  if (book.userId !== user.id) {
    return { success: false, error: "Only the book owner can mark it as returned" };
  }

  if (!book.lentToUserId) {
    return { success: false, error: "This book is not currently lent out" };
  }

  try {
    const borrowerId = book.lentToUserId;

    // Clear the lending info
    await db.book.update({
      where: { id: bookId },
      data: {
        lentToUserId: null,
        lentAt: null,
      },
    });

    // Update the request status
    await db.bookLendRequest.updateMany({
      where: {
        bookId,
        requesterId: borrowerId,
        status: "accepted",
      },
      data: {
        status: "returned",
      },
    });

    // Notify the borrower
    const ownerName = user.username ? `@${user.username}` : user.fullName || "The owner";
    await createNotification({
      userId: borrowerId,
      type: "book_returned",
      title: "Book Marked as Returned",
      message: `${ownerName} marked "${book.title}" as returned. Thanks for borrowing!`,
      bookId: book.id,
    });

    revalidatePath("/books");
    revalidatePath(`/books/${bookId}`);
    return { success: true };
  } catch (error) {
    console.error("Error marking book as returned:", error);
    return { success: false, error: "Failed to mark book as returned" };
  }
}

// Get user's book requests
export async function getMyBookRequests() {
  const user = await getCurrentUser();
  if (!user) return [];

  const requests = await db.bookLendRequest.findMany({
    where: { requesterId: user.id },
    include: {
      book: {
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests;
}

// Get a user's public book list (for sharing)
export async function getUserPublicBooks(userId: string) {
  const books = await db.book.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      author: true,
      description: true,
      coverUrl: true,
      language: true,
      genres: true,
      ownershipType: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return books;
}

// Get user info for public book list
export async function getUserForBookList(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      username: true,
      avatarUrl: true,
      _count: {
        select: { books: true },
      },
    },
  });

  return user;
}

// Get the daily book recommendation for the feed
// Picks one book that hasn't been shared to feed yet. If all have been shared, returns null.
// The same book is shown for the entire day (based on feedSharedAt date).
export async function getDailyBookRecommendation() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Check if we already have a book shared today
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const todaysBook = await db.book.findFirst({
    where: {
      feedSharedAt: { gte: todayStart },
    },
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (todaysBook) {
    // Check if current user has a pending request for this book
    const [userPendingRequest, commentCount] = await Promise.all([
      db.bookLendRequest.findFirst({
        where: {
          bookId: todaysBook.id,
          requesterId: user.id,
          status: "pending",
        },
      }),
      db.bookComment.count({ where: { bookId: todaysBook.id } }),
    ]);

    return {
      id: todaysBook.id,
      title: todaysBook.title,
      author: todaysBook.author,
      description: todaysBook.description,
      coverUrl: todaysBook.coverUrl,
      ownershipType: todaysBook.ownershipType,
      language: todaysBook.language,
      genres: todaysBook.genres,
      isLent: !!todaysBook.lentToUserId,
      feedSharedAt: todaysBook.feedSharedAt!,
      owner: todaysBook.owner,
      isOwnBook: user.id === todaysBook.userId,
      hasPendingRequest: !!userPendingRequest,
      commentCount,
    };
  }

  // No book shared today yet - pick the next unshared book
  const nextBook = await db.book.findFirst({
    where: {
      feedSharedAt: null,
    },
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" }, // Share oldest first
  });

  if (!nextBook) return null; // All books have been shared

  // Mark this book as shared today
  await db.book.update({
    where: { id: nextBook.id },
    data: { feedSharedAt: new Date() },
  });

  const [userPendingRequest, commentCount] = await Promise.all([
    db.bookLendRequest.findFirst({
      where: {
        bookId: nextBook.id,
        requesterId: user.id,
        status: "pending",
      },
    }),
    db.bookComment.count({ where: { bookId: nextBook.id } }),
  ]);

  return {
    id: nextBook.id,
    title: nextBook.title,
    author: nextBook.author,
    description: nextBook.description,
    coverUrl: nextBook.coverUrl,
    ownershipType: nextBook.ownershipType,
    language: nextBook.language,
    genres: nextBook.genres,
    isLent: !!nextBook.lentToUserId,
    feedSharedAt: new Date(),
    owner: nextBook.owner,
    isOwnBook: user.id === nextBook.userId,
    hasPendingRequest: !!userPendingRequest,
    commentCount,
  };
}

// Get user's books for their profile
export async function getUserBooksForProfile(userId: string) {
  const books = await db.book.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      author: true,
      coverUrl: true,
      language: true,
      ownershipType: true,
    },
    orderBy: { createdAt: "desc" },
    take: 6, // Show only 6 on profile
  });

  return books;
}

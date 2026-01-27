"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  requestBook,
  cancelBookRequest,
  acceptBookRequest,
  rejectBookRequest,
  markBookReturned,
  deleteBook,
} from "@/actions/books";
import { Button } from "@/components/ui/button";

interface BookActionsProps {
  bookId: string;
  isOwner: boolean;
  ownershipType: string;
  isLent: boolean;
  hasPendingRequest?: boolean;
  pendingRequestId?: string | null;
  requestId?: string;
  showRequestActions?: boolean;
}

export function BookActions({
  bookId,
  isOwner,
  ownershipType,
  isLent,
  hasPendingRequest,
  pendingRequestId,
  requestId,
  showRequestActions,
}: BookActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRequestBook = () => {
    startTransition(async () => {
      const result = await requestBook(bookId, requestMessage || undefined);
      if (result.success) {
        setShowRequestModal(false);
        setRequestMessage("");
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  const handleCancelRequest = () => {
    if (!pendingRequestId) return;
    startTransition(async () => {
      const result = await cancelBookRequest(pendingRequestId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  const handleAcceptRequest = () => {
    if (!requestId) return;
    startTransition(async () => {
      const result = await acceptBookRequest(requestId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  const handleRejectRequest = () => {
    if (!requestId) return;
    startTransition(async () => {
      const result = await rejectBookRequest(requestId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  const handleMarkReturned = () => {
    startTransition(async () => {
      const result = await markBookReturned(bookId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteBook(bookId);
      if (result.success) {
        router.push("/books");
      } else {
        alert(result.error);
      }
    });
  };

  // Show accept/reject buttons for pending requests
  if (showRequestActions && requestId) {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleAcceptRequest}
          disabled={isPending || isLent}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          {isPending ? "..." : "Accept"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRejectRequest}
          disabled={isPending}
        >
          {isPending ? "..." : "Decline"}
        </Button>
      </div>
    );
  }

  // Owner actions
  if (isOwner) {
    return (
      <div className="flex flex-wrap gap-2">
        {isLent && (
          <Button
            onClick={handleMarkReturned}
            disabled={isPending}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {isPending ? "..." : "📥 Mark as Returned"}
          </Button>
        )}
        <Link href={`/books/${bookId}/edit`}>
          <Button variant="outline">Edit</Button>
        </Link>
        {!showDeleteConfirm ? (
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-400 hover:text-red-300 hover:border-red-500/50"
          >
            Delete
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Sure?</span>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {isPending ? "..." : "Yes"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              No
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Non-owner actions for physical books
  if (ownershipType === "physical") {
    if (hasPendingRequest) {
      return (
        <Button
          variant="outline"
          onClick={handleCancelRequest}
          disabled={isPending}
          className="text-amber-400"
        >
          {isPending ? "..." : "Cancel Request"}
        </Button>
      );
    }

    if (isLent) {
      return (
        <Button variant="outline" disabled className="opacity-50">
          Currently Unavailable
        </Button>
      );
    }

    return (
      <>
        <Button
          onClick={() => setShowRequestModal(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          📚 Request to Borrow
        </Button>

        {/* Request Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowRequestModal(false)}
            />
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold text-white mb-4">Request to Borrow</h3>
              <p className="text-slate-400 mb-4">
                Send a message to the book owner (optional)
              </p>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Hi! I'd love to borrow this book..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                rows={3}
              />
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestBook}
                  disabled={isPending}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500"
                >
                  {isPending ? "Sending..." : "Send Request"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Digital or recommendation - no actions
  return null;
}

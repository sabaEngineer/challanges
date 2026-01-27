import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBook } from "@/actions/books";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { EditBookForm } from "./edit-form";

interface EditBookPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBookPage({ params }: EditBookPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const book = await getBook(id);

  if (!book) {
    notFound();
  }

  if (!book.isOwner) {
    redirect(`/books/${id}`);
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <BackButton />
        </div>

        <Card>
          <h1 className="text-2xl font-bold text-white mb-2">Edit Book</h1>
          <p className="text-slate-400 mb-6">Update your book details</p>

          <EditBookForm
            bookId={book.id}
            initialData={{
              title: book.title,
              author: book.author,
              description: book.description || "",
              coverUrl: book.coverUrl || "",
              language: book.language || "all",
              genre: book.genre || null,
              ownershipType: book.ownershipType as "physical" | "digital" | "recommendation",
            }}
          />
        </Card>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { BookForm } from "./book-form";

export default async function NewBookPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <BackButton />
        </div>

        <Card>
          <h1 className="text-2xl font-bold text-white mb-2">Add a Book</h1>
          <p className="text-slate-400 mb-6">
            Share a book recommendation or add a book you own
          </p>

          <BookForm />
        </Card>
      </div>
    </div>
  );
}

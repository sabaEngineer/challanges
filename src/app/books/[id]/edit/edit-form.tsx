"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBook, type BookOwnershipType } from "@/actions/books";
import { BOOK_GENRES } from "@/lib/book-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUploadCompact } from "@/components/image-upload";

const LANGUAGES = [
  { code: "all", label: "All Languages", flag: "🌍" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ka", label: "Georgian", flag: "🇬🇪" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
  { code: "other", label: "Other", flag: "📚" },
];

interface EditBookFormProps {
  bookId: string;
  initialData: {
    title: string;
    author: string;
    description: string;
    coverUrl: string;
    language: string;
    genres: string[];
    ownershipType: BookOwnershipType;
  };
}

export function EditBookForm({ bookId, initialData }: EditBookFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialData.title);
  const [author, setAuthor] = useState(initialData.author);
  const [description, setDescription] = useState(initialData.description);
  const [coverUrl, setCoverUrl] = useState(initialData.coverUrl);
  const [language, setLanguage] = useState(initialData.language || "all");
  const [genres, setGenres] = useState<string[]>(initialData.genres || []);
  const [ownershipType, setOwnershipType] = useState<BookOwnershipType>(
    initialData.ownershipType
  );

  const toggleGenre = (genreCode: string) => {
    setGenres((prev) =>
      prev.includes(genreCode)
        ? prev.filter((g) => g !== genreCode)
        : [...prev, genreCode]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !author.trim()) {
      alert("Please fill in the title and author");
      return;
    }

    startTransition(async () => {
      const result = await updateBook(bookId, {
        title: title.trim(),
        author: author.trim(),
        description: description.trim() || undefined,
        coverUrl: coverUrl || undefined,
        language,
        genres,
        ownershipType,
      });

      if (result.success) {
        router.push(`/books/${bookId}`);
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Book Cover
        </label>
        <ImageUploadCompact
          value={coverUrl || undefined}
          onChange={(url) => setCoverUrl(url || "")}
          prefix="books"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Book Title *
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Atomic Habits"
          required
        />
      </div>

      {/* Author */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Author *
        </label>
        <Input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="e.g., James Clear"
          required
        />
      </div>

      {/* Genres - Multiple Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Genres (select multiple)
          {genres.length > 0 && (
            <span className="ml-2 text-amber-400">({genres.length} selected)</span>
          )}
        </label>
        <div className="flex flex-wrap gap-2">
          {BOOK_GENRES.map((g) => (
            <button
              key={g.code}
              type="button"
              onClick={() => toggleGenre(g.code)}
              className={`px-3 py-2 rounded-lg border transition-all text-sm ${
                genres.includes(g.code)
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-slate-700 hover:border-slate-600 text-slate-300"
              }`}
            >
              <span className="mr-1">{g.emoji}</span>
              {g.label}
            </button>
          ))}
        </div>
        {genres.length > 0 && (
          <button
            type="button"
            onClick={() => setGenres([])}
            className="mt-2 text-xs text-slate-500 hover:text-slate-400"
          >
            Clear all genres
          </button>
        )}
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Language
        </label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-2 rounded-lg border transition-all text-sm ${
                language === lang.code
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-slate-700 hover:border-slate-600 text-slate-300"
              }`}
            >
              <span className="mr-1">{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ownership Type */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-3">
          How do you have this book?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setOwnershipType("physical")}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              ownershipType === "physical"
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-slate-700 hover:border-slate-600"
            }`}
          >
            <div className="text-2xl mb-2">📦</div>
            <div className="font-medium text-white">Physical Copy</div>
            <div className="text-xs text-slate-400 mt-1">
              Others can request to borrow
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOwnershipType("digital")}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              ownershipType === "digital"
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-700 hover:border-slate-600"
            }`}
          >
            <div className="text-2xl mb-2">💻</div>
            <div className="font-medium text-white">Digital Copy</div>
            <div className="text-xs text-slate-400 mt-1">
              eBook or online version
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOwnershipType("recommendation")}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              ownershipType === "recommendation"
                ? "border-violet-500 bg-violet-500/10"
                : "border-slate-700 hover:border-slate-600"
            }`}
          >
            <div className="text-2xl mb-2">💡</div>
            <div className="font-medium text-white">Recommendation</div>
            <div className="text-xs text-slate-400 mt-1">
              Just sharing a great read
            </div>
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Your thoughts on this book
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you like about this book? Why do you recommend it?"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
          rows={4}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !title.trim() || !author.trim()}
          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

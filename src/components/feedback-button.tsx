"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { submitFeedback, type FeedbackType } from "@/actions/feedback";

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: "feature", label: "Feature Request", emoji: "✨" },
  { value: "bug", label: "Bug Report", emoji: "🐛" },
  { value: "improvement", label: "Improvement", emoji: "💡" },
  { value: "other", label: "Other", emoji: "💬" },
];

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("feature");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const result = await submitFeedback({ type, title, content });

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setSubmitted(true);
      setIsSubmitting(false);
      // Reset after delay
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setTitle("");
        setContent("");
        setType("feature");
      }, 2000);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    if (!submitted) {
      // Keep form data if not submitted
    }
  };

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 group"
        title="Send Feedback"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-sm px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Send Feedback
        </span>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <Card 
            className="w-full max-w-lg max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {submitted ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-white mb-2">Thank You!</h3>
                <p className="text-slate-400">Your feedback has been submitted successfully.</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                  <h3 className="text-lg font-semibold text-white">Send Feedback</h3>
                  <button
                    onClick={handleClose}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                  {/* Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Feedback Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {FEEDBACK_TYPES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setType(t.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            type === t.value
                              ? "border-amber-500 bg-amber-500/10 text-amber-400"
                              : "border-slate-700 hover:border-slate-600 text-slate-300"
                          }`}
                        >
                          <span>{t.emoji}</span>
                          <span className="text-sm">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Brief summary of your feedback"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                      required
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Details
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Describe your feedback in detail..."
                      rows={4}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                      required
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !title.trim() || !content.trim()}
                      className="flex-1"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Feedback"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useRef } from "react";
import { getUploadUrl } from "@/actions/media";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  prefix?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, prefix = "uploads", className = "" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPEG, PNG, GIF, or WebP image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Get presigned URL
      const result = await getUploadUrl(file.type, prefix);
      
      if (result.error) {
        setError(result.error);
        setUploading(false);
        return;
      }

      // Upload to S3
      const response = await fetch(result.presignedUrl!, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      onChange(result.objectUrl!);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image. Please try again.");
    }

    setUploading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-48 object-cover rounded-lg border border-slate-700"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-sm text-white transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${dragOver 
              ? "border-amber-500 bg-amber-500/10" 
              : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"
            }
            ${uploading ? "opacity-50 cursor-wait" : ""}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Uploading...</p>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-2">📷</div>
              <p className="text-slate-300 mb-1">Click or drag to upload image</p>
              <p className="text-xs text-slate-500">JPEG, PNG, GIF, WebP (max 5MB)</p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}

// Compact version for inline use
export function ImageUploadCompact({ value, onChange, prefix = "uploads" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Max 5MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const result = await getUploadUrl(file.type, prefix);
      
      if (result.error) {
        setError(result.error);
        setUploading(false);
        return;
      }

      const response = await fetch(result.presignedUrl!, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!response.ok) throw new Error("Upload failed");

      onChange(result.objectUrl!);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Upload failed");
    }

    setUploading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt="Uploaded"
            className="w-16 h-16 object-cover rounded-lg border border-slate-700"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <span>📷</span>
              <span>Add Image</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}


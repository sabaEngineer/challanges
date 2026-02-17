"use client";

import { useState, useRef, useCallback } from "react";
import { getUploadUrl } from "@/actions/media";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  onPositionChange?: (position: string) => void;
  position?: string;
  prefix?: string;
  className?: string;
  acceptVideo?: boolean;
}

function isVideoUrl(url: string) {
  const videoExts = [".mp4", ".webm", ".mov", ".m4v", ".avi", ".3gp", ".ogg", ".mpeg"];
  const lower = url.toLowerCase().split("?")[0];
  return videoExts.some((ext) => lower.endsWith(ext));
}

export function ImageUpload({
  value,
  onChange,
  onPositionChange,
  position = "50% 50%",
  prefix = "uploads",
  className = "",
  acceptVideo = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [posStart, setPosStart] = useState({ x: 50, y: 50 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
  const allowedTypes = acceptVideo ? [...allowedImageTypes, ...allowedVideoTypes] : allowedImageTypes;
  const acceptString = acceptVideo
    ? "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/x-m4v"
    : "image/jpeg,image/png,image/gif,image/webp";
  const maxSize = acceptVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
  const maxSizeLabel = acceptVideo ? "50MB" : "5MB";

  const isVideo = value ? isVideoUrl(value) : false;

  // Parse position string to x,y percentages
  const parsePosition = useCallback((pos: string): { x: number; y: number } => {
    const parts = pos.split(" ").map((p) => parseFloat(p));
    return { x: parts[0] || 50, y: parts[1] || 50 };
  }, []);

  const handleFile = async (file: File) => {
    if (!file) return;

    const isAllowed =
      allowedTypes.includes(file.type) ||
      file.type.startsWith("image/") ||
      (acceptVideo && file.type.startsWith("video/"));

    if (!isAllowed) {
      setError(
        acceptVideo
          ? "Please upload an image or video file"
          : "Please upload a JPEG, PNG, GIF, or WebP image"
      );
      return;
    }

    if (file.size > maxSize) {
      setError(`File must be smaller than ${maxSizeLabel}`);
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
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      onChange(result.objectUrl!);
      // Reset position for new upload
      onPositionChange?.("50% 50%");
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload. Please try again.");
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
    onPositionChange?.("50% 50%");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // Drag to reposition image
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isVideo) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    const currentPos = parsePosition(position);
    setPosStart(currentPos);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isVideo || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    // Convert pixel delta to percentage (invert because we're moving the focal point)
    const pxToPercentX = (dx / rect.width) * -100;
    const pxToPercentY = (dy / rect.height) * -100;

    const newX = Math.max(0, Math.min(100, posStart.x + pxToPercentX));
    const newY = Math.max(0, Math.min(100, posStart.y + pxToPercentY));

    onPositionChange?.(`${Math.round(newX)}% ${Math.round(newY)}%`);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={acceptString}
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        <div className="space-y-2">
          <div
            ref={containerRef}
            className={`relative group overflow-hidden rounded-lg border border-slate-700 ${
              !isVideo ? "cursor-grab active:cursor-grabbing" : ""
            }`}
            style={{ height: "192px" }}
            onPointerDown={!isVideo ? handlePointerDown : undefined}
            onPointerMove={!isVideo ? handlePointerMove : undefined}
            onPointerUp={!isVideo ? handlePointerUp : undefined}
            onPointerCancel={!isVideo ? handlePointerUp : undefined}
          >
            {isVideo ? (
              <video
                src={value}
                className="w-full h-full object-cover"
                muted
                playsInline
                loop
                autoPlay
              />
            ) : (
              <img
                src={value}
                alt="Uploaded"
                className="w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
                style={{ objectPosition: position }}
              />
            )}

            {/* Drag hint for images */}
            {!isVideo && !isDragging && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span className="text-white text-xs font-medium">Drag to reposition</span>
                </div>
              </div>
            )}

            {/* Dragging indicator */}
            {isDragging && (
              <div className="absolute inset-0 border-2 border-amber-500 rounded-lg pointer-events-none" />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
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
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
            {!isVideo && (
              <button
                type="button"
                onClick={() => onPositionChange?.("50% 50%")}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Reset position
              </button>
            )}
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
            ${
              dragOver
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
              <div className="text-4xl mb-2">{acceptVideo ? "📷🎬" : "📷"}</div>
              <p className="text-slate-300 mb-1">
                Click or drag to upload {acceptVideo ? "image or video" : "image"}
              </p>
              <p className="text-xs text-slate-500">
                {acceptVideo
                  ? "Images (max 5MB) or Videos (max 50MB)"
                  : "JPEG, PNG, GIF, WebP (max 5MB)"}
              </p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
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

// Circular avatar version
interface AvatarUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  fallbackInitial?: string;
  size?: "sm" | "md" | "lg";
}

export function AvatarUpload({ value, onChange, fallbackInitial = "U", size = "lg" }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "w-16 h-16 text-xl",
    md: "w-20 h-20 text-2xl",
    lg: "w-24 h-24 text-3xl",
  };

  const handleFile = async (file: File) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPEG, PNG, GIF, or WebP image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const result = await getUploadUrl(file.type, "avatars");

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
      setError("Failed to upload image");
    }

    setUploading(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="relative group">
        {value ? (
          <img
            src={value}
            alt="Avatar"
            className={`${sizeClasses[size]} rounded-full ring-4 ring-amber-500/30 object-cover`}
          />
        ) : (
          <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white`}>
            {fallbackInitial.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Hover Overlay */}
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className={`absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploading ? "opacity-100" : ""}`}
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="flex flex-col items-center text-white">
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs">Change</span>
            </div>
          )}
        </button>
      </div>

      {error && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

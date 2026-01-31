"use client";

import { useState, useRef } from "react";
import { getUploadUrl } from "@/actions/media";

type MediaType = "image" | "video" | null;

interface MediaUploadProps {
  value?: string;
  onChange: (url: string | null, type: MediaType) => void;
  prefix?: string;
  className?: string;
  maxImageSize?: number; // in MB
  maxVideoSize?: number; // in MB
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",  // .mov on iPhone/Mac
  "video/mov",
  "video/x-m4v",      // iPhone video format
  "video/x-msvideo",  // .avi
  "video/3gpp",       // .3gp mobile videos
  "video/3gpp2",      // .3g2
  "video/mpeg",       // .mpeg
  "video/ogg",        // .ogv
];

function getMediaType(mimeType: string, fileName?: string): MediaType {
  // Check exact match first
  if (IMAGE_TYPES.includes(mimeType)) return "image";
  if (VIDEO_TYPES.includes(mimeType)) return "video";
  
  // Fallback: check if it starts with image/ or video/
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  
  // Last resort: check file extension if MIME type is empty or unknown
  if (fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"];
    const videoExts = ["mp4", "webm", "mov", "avi", "m4v", "3gp", "mkv", "mpeg", "mpg", "ogv"];
    
    if (ext && imageExts.includes(ext)) return "image";
    if (ext && videoExts.includes(ext)) return "video";
  }
  
  return null;
}

function isVideoUrl(url: string): boolean {
  const videoExtensions = [".mp4", ".webm", ".mov", ".quicktime"];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || 
         url.includes("/videos/") ||
         url.includes("video");
}

export function MediaUpload({ 
  value, 
  onChange, 
  prefix = "uploads", 
  className = "",
  maxImageSize = 5,
  maxVideoSize = 50, 
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    console.log("File type detected:", file.type, "File name:", file.name);
    
    const mediaType = getMediaType(file.type, file.name);
    
    // Validate file type
    if (!mediaType) {
      setError(`Unsupported file type: ${file.type || "unknown"} (${file.name})`);
      return;
    }

    // Validate file size
    const maxSize = mediaType === "video" ? maxVideoSize : maxImageSize;
    if (file.size > maxSize * 1024 * 1024) {
      setError(`${mediaType === "video" ? "Video" : "Image"} must be smaller than ${maxSize}MB`);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Get presigned URL with appropriate prefix
      const uploadPrefix = mediaType === "video" ? `${prefix}/videos` : prefix;
      const result = await getUploadUrl(file.type, uploadPrefix);
      
      if (result.error) {
        setError(result.error);
        setUploading(false);
        return;
      }

      // Upload to S3 with progress tracking
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        
        xhr.open("PUT", result.presignedUrl!);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      onChange(result.objectUrl!, mediaType);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload. Please try again.");
    }

    setUploading(false);
    setUploadProgress(0);
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
    onChange(null, null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const isVideo = value ? isVideoUrl(value) : false;

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          {isVideo ? (
            <video
              src={`${value}#t=0.1`}
              controls
              preload="metadata"
              className="w-full max-h-64 object-contain rounded-lg border border-slate-700 bg-black"
            />
          ) : (
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-48 object-cover rounded-lg border border-slate-700"
            />
          )}
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
              <p className="text-sm text-slate-400">Uploading... {uploadProgress}%</p>
              <div className="w-full max-w-xs h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-2">📷 🎥</div>
              <p className="text-slate-300 mb-1">Click or drag to upload image or video</p>
              <p className="text-xs text-slate-500">Images: JPEG, PNG, GIF, WebP (max {maxImageSize}MB)</p>
              <p className="text-xs text-slate-500">Videos: MP4, WebM, MOV (max {maxVideoSize}MB)</p>
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

// Compact version for inline use (like in check-in modals)
export function MediaUploadCompact({ 
  value, 
  onChange, 
  prefix = "uploads",
  maxImageSize = 5,
  maxVideoSize = 50,
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    console.log("File type detected:", file.type, "File name:", file.name);
    
    const mediaType = getMediaType(file.type, file.name);
    
    if (!mediaType) {
      // Show the actual file type in the error for debugging
      setError(`Unsupported: ${file.type || "unknown type"} (${file.name})`);
      return;
    }

    const maxSize = mediaType === "video" ? maxVideoSize : maxImageSize;
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Max ${maxSize}MB`);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadPrefix = mediaType === "video" ? `${prefix}/videos` : prefix;
      const result = await getUploadUrl(file.type, uploadPrefix);
      
      if (result.error) {
        setError(result.error);
        setUploading(false);
        return;
      }

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        
        xhr.open("PUT", result.presignedUrl!);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      onChange(result.objectUrl!, mediaType);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Upload failed");
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const isVideo = value ? isVideoUrl(value) : false;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        <div className="flex items-center gap-3">
          {isVideo ? (
            <video
              src={`${value}#t=0.1`}
              preload="metadata"
              className="w-16 h-16 object-cover rounded-lg border border-slate-700 bg-black"
            />
          ) : (
            <img
              src={value}
              alt="Uploaded"
              className="w-16 h-16 object-cover rounded-lg border border-slate-700"
            />
          )}
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
              onClick={() => onChange(null, null)}
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
              <span>Uploading... {uploadProgress}%</span>
            </>
          ) : (
            <>
              <span>📷</span>
              <span>Add Image/Video</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

// Helper component to display media (image or video) in posts
export function MediaDisplay({ 
  url, 
  alt = "Media",
  className = "",
}: { 
  url: string; 
  alt?: string;
  className?: string;
}) {
  const isVideo = isVideoUrl(url);

  if (isVideo) {
    return (
      <video
        src={`${url}#t=0.1`}
        controls
        className={`w-full h-auto bg-black ${className}`}
        preload="metadata"
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`w-full h-auto ${className}`}
    />
  );
}

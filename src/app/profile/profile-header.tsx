"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarUpload } from "@/components/image-upload";
import { updateAvatar, updateProfile } from "@/actions/profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProfileHeaderProps {
  user: {
    avatarUrl: string | null;
    fullName: string | null;
    username: string | null;
    email: string;
    createdAt: Date;
  };
  rankTitle: {
    title: string;
    icon: string;
    color: string;
  };
}

export function ProfileHeader({ user, rankTitle }: ProfileHeaderProps) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [fullName, setFullName] = useState(user.fullName || "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleAvatarChange = async (url: string | null) => {
    if (!url) return;
    
    setSaving(true);
    setAvatarUrl(url);
    
    const result = await updateAvatar(url);
    if (!result.success) {
      // Revert on error
      setAvatarUrl(user.avatarUrl);
    }
    
    setSaving(false);
  };

  const handleSaveName = async () => {
    if (!fullName.trim()) {
      setNameError("Name cannot be empty");
      return;
    }

    setSavingName(true);
    setNameError(null);

    const result = await updateProfile({ fullName: fullName.trim() });
    
    if (result.success) {
      setIsEditingName(false);
      router.refresh();
    } else {
      setNameError(result.error || "Failed to update name");
    }
    
    setSavingName(false);
  };

  const handleCancelEdit = () => {
    setFullName(user.fullName || "");
    setIsEditingName(false);
    setNameError(null);
  };

  return (
    <Card className="mb-8">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <AvatarUpload
            value={avatarUrl}
            onChange={handleAvatarChange}
            fallbackInitial={user.fullName || user.email}
            size="lg"
          />
          {saving && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-amber-400">
              Saving...
            </div>
          )}
        </div>
        
        <div className="flex-1 text-center sm:text-left">
          {isEditingName ? (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  placeholder="Enter your name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                />
              </div>
              {nameError && (
                <p className="text-red-400 text-xs mb-2">{nameError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {savingName ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={savingName}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white">
                {user.fullName || "Anonymous User"}
              </h1>
              <button
                onClick={() => setIsEditingName(true)}
                className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                title="Edit name"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <span className={`text-sm ${rankTitle.color}`}>
                {rankTitle.icon} {rankTitle.title}
              </span>
            </div>
          )}
          {user.username && (
            <p className="text-amber-400 font-medium mb-1">@{user.username}</p>
          )}
          <p className="text-slate-400 text-sm">{user.email}</p>
          <p className="text-slate-500 text-xs mt-2">
            Member since {new Date(user.createdAt).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-amber-400/60 text-xs mt-1">
            Hover on avatar to change photo • Click pencil to edit name
          </p>
        </div>
      </div>
    </Card>
  );
}


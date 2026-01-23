"use client";

import { useState } from "react";
import { AvatarUpload } from "@/components/image-upload";
import { updateAvatar } from "@/actions/profile";
import { Card } from "@/components/ui/card";

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
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [saving, setSaving] = useState(false);

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
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white">
              {user.fullName || "Anonymous User"}
            </h1>
            <span className={`text-sm ${rankTitle.color}`}>
              {rankTitle.icon} {rankTitle.title}
            </span>
          </div>
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
            Hover on avatar to change photo
          </p>
        </div>
      </div>
    </Card>
  );
}


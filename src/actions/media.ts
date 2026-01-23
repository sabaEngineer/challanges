"use server";

import { getCurrentUser } from "@/lib/auth";
import { generatePresignedUrl, deleteObject } from "@/lib/s3";

export async function getUploadUrl(contentType: string, prefix: string = "uploads") {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to upload files" };
  }

  // Validate content type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(contentType)) {
    return { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." };
  }

  try {
    const result = await generatePresignedUrl(contentType, prefix);
    return {
      success: true,
      presignedUrl: result.presignedUrl,
      objectUrl: result.objectUrl,
      objectKey: result.objectKey,
    };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return { error: "Failed to generate upload URL" };
  }
}

export async function deleteUploadedFile(objectKey: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in" };
  }

  try {
    await deleteObject(objectKey);
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    return { error: "Failed to delete file" };
  }
}


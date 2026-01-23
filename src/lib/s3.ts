import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Lazy initialization to ensure env vars are available
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        `Missing AWS configuration. Region: ${region ? "✓" : "✗"}, AccessKey: ${accessKeyId ? "✓" : "✗"}, SecretKey: ${secretAccessKey ? "✓" : "✗"}`
      );
    }

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3Client;
}

function getConfig() {
  const region = process.env.AWS_REGION;
  const bucketName = process.env.AWS_BUCKET_NAME;
  const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

  if (!region || !bucketName) {
    throw new Error("AWS_REGION and AWS_BUCKET_NAME must be defined");
  }

  return { region, bucketName, cloudFrontDomain };
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  objectUrl: string;
  objectKey: string;
}

/**
 * Generate a pre-signed URL for uploading objects to S3
 */
export async function generatePresignedUrl(
  contentType: string,
  prefix?: string
): Promise<PresignedUrlResponse> {
  const client = getS3Client();
  const { bucketName, region, cloudFrontDomain } = getConfig();
  
  const uuid = randomUUID();
  const objectKey = prefix ? `${prefix}/${uuid}` : uuid;

  const putObjectCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: contentType,
    ACL: "public-read",
  });

  const presignedUrl = await getSignedUrl(client, putObjectCommand, {
    expiresIn: 60 * 5, // 5 minutes
  });

  const objectUrl = cloudFrontDomain
    ? `https://${cloudFrontDomain}/${objectKey}`
    : `https://${bucketName}.s3.${region}.amazonaws.com/${objectKey}`;

  return {
    presignedUrl,
    objectUrl,
    objectKey,
  };
}

/**
 * Delete an object from S3
 */
export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client();
  const { bucketName } = getConfig();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await client.send(command);
}

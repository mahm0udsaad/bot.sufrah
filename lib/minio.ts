import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3"
import { randomUUID } from "crypto"

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "http://localhost:9000"
const MINIO_REGION = process.env.MINIO_REGION || "us-east-1"
const MINIO_ACCESS_KEY = process.env.MINIO_ROOT_USER || "minioadmin"
const MINIO_SECRET_KEY = process.env.MINIO_ROOT_PASSWORD || "minioadmin123"
const DEFAULT_BUCKET = process.env.MINIO_BUCKET || "uploads"
const MINIO_ENABLED = process.env.MINIO_ENABLED !== "false"

if (!MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
  console.warn("[minio] MINIO_ROOT_USER/MINIO_ROOT_PASSWORD are not set, using defaults")
}

export const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: MINIO_REGION,
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
})

export async function ensureBucketExists(bucket: string = DEFAULT_BUCKET) {
  if (!MINIO_ENABLED) {
    console.warn("[minio] MinIO is disabled")
    return
  }

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
    console.log(`[minio] Bucket "${bucket}" exists`)
  } catch (headError: any) {
    console.log(`[minio] Bucket "${bucket}" doesn't exist, creating...`)
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }))
      console.log(`[minio] Bucket "${bucket}" created successfully`)
    } catch (createError: any) {
      console.error(`[minio] Failed to create bucket "${bucket}":`, createError.message)
      throw new Error(`Failed to create MinIO bucket: ${createError.message}`)
    }
  }
}

export async function uploadToMinio(params: {
  bucket?: string
  originalName: string
  contentType?: string
  buffer: Buffer | Uint8Array | ArrayBuffer
  makePublic?: boolean
}): Promise<{ key: string; url: string; bucket: string }> {
  if (!MINIO_ENABLED) {
    throw new Error("MinIO is disabled. Set MINIO_ENABLED=true to enable file uploads.")
  }

  const bucket = params.bucket || DEFAULT_BUCKET
  
  try {
    await ensureBucketExists(bucket)
  } catch (error: any) {
    console.error("[minio] ensureBucketExists failed:", error)
    throw new Error(`MinIO bucket check failed: ${error.message}. Check if MinIO is running at ${MINIO_ENDPOINT}`)
  }

  const safeName = params.originalName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const key = `${randomUUID()}-${safeName}`

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: params.buffer as any,
        ContentType: params.contentType,
        // Note: Some MinIO deployments ignore ACLs; bucket policy may be required
        ACL: params.makePublic ? "public-read" : undefined,
      }),
    )
    console.log(`[minio] File uploaded successfully: ${key}`)
  } catch (error: any) {
    console.error("[minio] Upload failed:", error)
    throw new Error(`MinIO upload failed: ${error.message}`)
  }

  const url = `${MINIO_ENDPOINT.replace(/\/$/, "")}/${bucket}/${encodeURIComponent(key)}`
  return { key, url, bucket }
}



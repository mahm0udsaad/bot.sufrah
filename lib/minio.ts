import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3"
import { randomUUID } from "crypto"

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "https://storage.sufrah.sa"
const MINIO_REGION = process.env.MINIO_REGION || "us-east-1"
const MINIO_ACCESS_KEY = process.env.MINIO_ROOT_USER
const MINIO_SECRET_KEY = process.env.MINIO_ROOT_PASSWORD
const DEFAULT_BUCKET = process.env.MINIO_BUCKET || "uploads"

if (!MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
  console.warn("[minio] MINIO_ROOT_USER/MINIO_ROOT_PASSWORD are not set")
}

export const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: MINIO_REGION,
  credentials: MINIO_ACCESS_KEY && MINIO_SECRET_KEY ? {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  } : undefined,
  forcePathStyle: true,
})

export async function ensureBucketExists(bucket: string = DEFAULT_BUCKET) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
  }
}

export async function uploadToMinio(params: {
  bucket?: string
  originalName: string
  contentType?: string
  buffer: Buffer | Uint8Array | ArrayBuffer
  makePublic?: boolean
}): Promise<{ key: string; url: string; bucket: string }> {
  const bucket = params.bucket || DEFAULT_BUCKET
  await ensureBucketExists(bucket)

  const safeName = params.originalName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const key = `${randomUUID()}-${safeName}`

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

  const url = `${MINIO_ENDPOINT.replace(/\/$/, "")}/${bucket}/${encodeURIComponent(key)}`
  return { key, url, bucket }
}



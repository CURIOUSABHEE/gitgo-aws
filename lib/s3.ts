import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || process.env.GITGO_AWS_REGION || "us-east-1",
    credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
            : undefined, // Use IAM role in production
})

const BUCKET_NAME = process.env.GITGO_S3_BUCKET_NAME || "gitgo-resumes-bucket-users"

/**
 * Upload a resume PDF to S3
 * @param buffer - PDF file buffer
 * @param fileName - Original file name
 * @param userId - User's GitHub ID
 * @returns S3 object key
 */
export async function uploadResumeToS3(
    buffer: Buffer,
    fileName: string,
    userId: string
): Promise<string> {
    // Generate unique key: resumes/{userId}/{timestamp}-{fileName}
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const key = `resumes/${userId}/${timestamp}-${sanitizedFileName}`

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
        Metadata: {
            userId,
            originalFileName: fileName,
            uploadedAt: new Date().toISOString(),
        },
    })

    await s3Client.send(command)
    console.log(`[S3] Uploaded resume to: ${key}`)

    return key
}

/**
 * Delete a resume PDF from S3
 * @param key - S3 object key
 */
export async function deleteResumeFromS3(key: string): Promise<void> {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        })

        await s3Client.send(command)
        console.log(`[S3] Deleted resume: ${key}`)
    } catch (error: any) {
        console.error(`[S3] Failed to delete resume ${key}:`, error.message)
        // Don't throw - deletion failure shouldn't block the operation
    }
}

/**
 * Get the S3 URL for a resume (for reference, not public access)
 * @param key - S3 object key
 * @returns S3 URL
 */
export function getResumeS3Url(key: string): string {
    return `s3://${BUCKET_NAME}/${key}`
}

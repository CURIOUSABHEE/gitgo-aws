import Recommendation from "@/models/Recommendation";
import { ddbDocClient } from "@/lib/dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

export class RecommendationRepository {
    static async save(data: any): Promise<void> {
        const isAwsMode = process.env.DATABASE_MODE === 'dynamodb';

        if (isAwsMode) {
            console.log(`[DB Layer] Using AWS DynamoDB to save recommendation`);
            // Fallback to a timestamp-based ID if userId is missing (like test profiles)
            const primaryId = data.userId ? String(data.userId) : `test-${Date.now()}`;

            const command = new PutCommand({
                TableName: process.env.AWS_DYNAMODB_RECS || "GitGo-Recommendations",
                Item: {
                    ...data,
                    userId: primaryId,          // Partition Key
                    createdAt: new Date().toISOString() // Sort Key
                }
            });

            try {
                await ddbDocClient.send(command);
            } catch (err) {
                console.error("[DB Layer] DynamoDB Error:", err);
                throw err;
            }
        } else {
            console.log(`[DB Layer] Using Local MongoDB to save recommendation`);
            try {
                await Recommendation.create(data);
            } catch (err) {
                console.error("[DB Layer] MongoDB Error:", err);
                throw err;
            }
        }
    }
}

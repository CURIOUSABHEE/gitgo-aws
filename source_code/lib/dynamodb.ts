import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// AWS Region is automatically pulled from environment variables in Amplify
const region = process.env.AWS_REGION || "us-east-1";

declare global {
    var _ddbClient: DynamoDBClient | undefined;
    var _ddbDocClient: DynamoDBDocumentClient | undefined;
}

let ddbClient: DynamoDBClient;
let ddbDocClient: DynamoDBDocumentClient;

if (!global._ddbClient) {
    global._ddbClient = new DynamoDBClient({ region });
}
ddbClient = global._ddbClient;

if (!global._ddbDocClient) {
    const marshallOptions = {
        // Whether to automatically convert empty strings, blobs, and sets to `null`.
        convertEmptyValues: false,
        // Whether to remove undefined values while marshalling.
        removeUndefinedValues: true,
        // Whether to convert typeof object to map attribute.
        convertClassInstanceToMap: false,
    };

    const unmarshallOptions = {
        // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
        wrapNumbers: false,
    };

    const translateConfig = { marshallOptions, unmarshallOptions };
    global._ddbDocClient = DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
ddbDocClient = global._ddbDocClient;

export { ddbClient, ddbDocClient };

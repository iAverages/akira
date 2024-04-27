import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const client = new S3Client({
    region: process.env.S3_REGION ?? "",
    endpoint: process.env.S3_ENDPOINT ?? "",
    credentials: {
        accessKeyId: process.env.S3_KEY_ID ?? "",
        secretAccessKey: process.env.S3_APPLICATION_KEY ?? "",
    },
});

const MAX_LIMIT = 1000;

export const listFiles = async ({ limit, startAfter }: { limit: number; startAfter: string }) => {
    const command = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET ?? "",
        Prefix: process.env.S3_PATH_PREFIX ?? "",
        MaxKeys: Math.min(limit, MAX_LIMIT),
        StartAfter: startAfter,
        Delimiter: "/",
    });
    return client.send(command);
};

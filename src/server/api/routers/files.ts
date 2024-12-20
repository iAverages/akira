import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import { listFiles } from "~/server/api/s3";
import { db } from "~/lib/db";
import { Prisma, type File } from "@prisma/client";

export const filesRouter = createTRPCRouter({
    homeList: publicProcedure
        .input(z.object({ limit: z.number().int().positive(), tags: z.string().array() }))
        .query(async ({ input }) => {
            let files: File[] = [];
            if (input.tags.length === 0) {
                files = await db.$queryRaw<File[]>`SELECT *
                            FROM File
                            ORDER BY RAND(1234);
                        `;
            } else {
                files = await db.$queryRaw<File[]>(Prisma.sql`SELECT *
                            FROM File
                            WHERE EXISTS (
                                SELECT 1
                                FROM \`_FileToTag\`
                                INNER JOIN \`Tag\` ON \`_FileToTag\`.\`B\` = \`Tag\`.\`name\`
                                WHERE \`_FileToTag\`.\`A\` = File.id
                                  -- TODO FIX THIS LOL
                                AND \`Tag\`.\`name\` IN (${Prisma.join(input.tags)})
                            )
                            ORDER BY RAND(1234);
                        `);
            }

            return files;
        }),

    get: publicProcedure
        .input(
            z.object({
                limit: z.number().int().positive(),
                startAfter: z.string(),
            })
        )
        .query(async ({ input }) => {
            const files = await listFiles(input);
            if (!files?.Contents) return [];
            return files.Contents;
        }),

    setLastViewed: publicProcedure
        .input(
            z.object({
                startAfter: z.string(),
            })
        )
        .mutation(({ input }) => {
            return db.state.upsert({
                create: {
                    key: "lastKey",
                    value: input.startAfter,
                },
                update: {
                    value: input.startAfter,
                },
                where: {
                    key: "lastKey",
                },
            });
        }),

    addTag: publicProcedure
        .input(
            z.object({
                image: z.string(),
                tag: z.string(),
            })
        )
        .mutation(({ input }) => {
            return db.file.upsert({
                create: {
                    path: input.image,
                    tags: {
                        connect: {
                            name: input.tag,
                        },
                    },
                },
                update: {
                    tags: {
                        connect: {
                            name: input.tag,
                        },
                    },
                    updatedAt: new Date(),
                },
                where: {
                    path: input.image,
                },
            });
        }),

    removeTag: publicProcedure
        .input(
            z.object({
                image: z.string(),
                tag: z.string(),
            })
        )
        .mutation(({ input }) => {
            return db.file.update({
                data: {
                    tags: {
                        disconnect: {
                            name: input.tag,
                        },
                    },
                },
                where: {
                    path: input.image,
                },
            });
        }),
});

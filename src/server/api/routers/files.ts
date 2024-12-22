import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import { listFiles } from "~/server/api/s3";
import { type File } from "@prisma/client";
import { db as dbqb, query } from "~/server/api/kysely";
import { sql } from "kysely";
import { db } from "~/lib/db";

export const filesRouter = createTRPCRouter({
  homeList: publicProcedure
    .input(
      z.object({
        limit: z.number().int().positive(),
        tags: z.string().array(),
        page: z.number().default(0),
      }),
    )
    .query(async ({ input }) => {
      let files: File[] = [];
      if (input.tags.length === 0) {
        const statement = dbqb
          .selectFrom("File")
          .selectAll()
          .offset(input.page * input.limit)
          .orderBy(sql`RAND(1234)`)
          .limit(input.limit);

        files = await query(statement);
      } else {
        const statement = dbqb
          .selectFrom("File")
          .selectAll()
          .where((qb) =>
            qb.exists(
              qb
                .selectFrom("_FileToTag")
                .selectAll()
                .innerJoin("Tag", "_FileToTag.B", "Tag.name")
                .whereRef("_FileToTag.A", "=", "File.id")
                .where("Tag.name", "in", input.tags),
            ),
          )
          .orderBy(sql`RAND(1234)`);

        files = await query(statement);
      }

      return {
        files,
        nextPage: input.page + 1,
      };
    }),

  get: publicProcedure
    .input(
      z.object({
        limit: z.number().int().positive(),
        startAfter: z.string(),
      }),
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
      }),
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
      }),
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
      }),
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

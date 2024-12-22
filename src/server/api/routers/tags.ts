import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import { db } from "~/lib/db";

export const tagsRouter = createTRPCRouter({
  get: publicProcedure.query(async () => {
    const tags = await db.tag.findMany({ select: { name: true } });
    return tags.map((t) => t.name);
  }),

  create: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input }) => {
      return db.tag.create({ data: { name: input.name } });
    }),
});

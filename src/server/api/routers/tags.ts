import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import { db } from "~/lib/db";

export const tagsRouter = createTRPCRouter({
    get: publicProcedure.query(() => {
        return db.tag.findMany();
    }),

    create: publicProcedure.input(z.object({ name: z.string() })).mutation(({ input }) => {
        return db.tag.create({ data: { name: input.name } });
    }),
});

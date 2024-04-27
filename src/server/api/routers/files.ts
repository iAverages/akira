import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import { listFiles } from "~/server/api/s3";

export const filesRouter = createTRPCRouter({
    get: publicProcedure
        .input(
            z.object({
                limit: z.number().int().positive(),
                startAfter: z.string(),
            })
        )
        .query(({ input }) => {
            return listFiles(input);
        }),
});

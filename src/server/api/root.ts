import { tagsRouter } from "~/server/api/routers/tags";
import { filesRouter } from "./routers/files";
import { createTRPCRouter } from "./utils";

export const appRouter = createTRPCRouter({
    files: filesRouter,
    tags: tagsRouter,
});

export type AppRouter = typeof appRouter;

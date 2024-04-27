import { filesRouter } from "./routers/files";
import { createTRPCRouter } from "./utils";

export const appRouter = createTRPCRouter({
    files: filesRouter,
});

export type AppRouter = typeof appRouter;

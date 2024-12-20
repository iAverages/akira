import { createQuery } from "@tanstack/solid-query";
import { api } from "~/lib/api";

export const useTags = () => {
    return createQuery(() => ({
        queryKey: ["tags"],
        queryFn: () => api.tags.get.query(),
    }));
};

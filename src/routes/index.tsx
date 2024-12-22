import { As, Select } from "@kobalte/core";
import { createInfiniteQuery, createQuery } from "@tanstack/solid-query";
import { For, Show, createMemo, createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { Button } from "~/components/ui/button";
import {
  Select as SelectRoot,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { api } from "~/lib/api";
import { cn } from "~/lib/utils";
import { useTags } from "~/queries/useTags";

const CDN_URL = "http://localhost:3001/"; // import.meta.env.VITE_S3_IMAGE_PROXY_URL ?? "";

const Index = () => {
  const [filters, setFilters] = createStore<{ tags: string[]; limit: number }>({
    tags: [],
    limit: 50,
  });

  const tags = useTags();

  const pageData = createInfiniteQuery(() => ({
    queryKey: ["files", "list", filters],
    queryFn: ({ pageParam }) => {
      return api.files.homeList.query({ ...filters, page: pageParam });
    },
    staleTime: Infinity,
    getNextPageParam: (data) => data.nextPage,
    initialPageParam: 0,
  }));

  const files = createMemo(() => pageData?.data?.pages.flatMap((p) => p.files));

  return (
    <div class={"flex flex-col gap-6 mt-6"}>
      <div class={"px-6"}>
        <div class={"flex gap-1"}>
          <div class={"flex flex-col gap-1"}>
            <h3>Limit</h3>
            <SelectRoot
              value={filters.limit}
              onChange={(val) => {
                setFilters("limit", val as number);
              }}
              options={[25, 50, 100, 150, 200]}
              itemComponent={(props) => (
                <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
              )}
            >
              <SelectTrigger>
                <SelectValue<string>>
                  {(state) => state.selectedOption()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent />
            </SelectRoot>
          </div>
          <div class={"flex flex-col gap-1"}>
            <h3>Tags</h3>
            <Show when={tags.data}>
              {(tags) => (
                <SelectRoot<string>
                  multiple
                  value={filters.tags}
                  onChange={(val) => {
                    setFilters("tags", val);
                  }}
                  options={tags()}
                  placeholder="Select some tags"
                  itemComponent={(props) => (
                    <SelectItem
                      item={props.item}
                      class={cn({
                        "bg-accent text-accent-foreground":
                          filters.tags.includes(props.item.rawValue),
                      })}
                    >
                      <Select.ItemLabel>{props.item.rawValue}</Select.ItemLabel>
                    </SelectItem>
                  )}
                  class={"w-96"}
                >
                  <SelectTrigger asChild>
                    <As component="div">
                      <SelectValue<string>>
                        {(state) => (
                          <div class={"flex gap-1"}>
                            <For each={state.selectedOptions()}>
                              {(option) => (
                                <span
                                  onPointerDown={(e) => e.stopPropagation()}
                                  class={
                                    "bg-neutral-800 px-2 py-1 rounded flex gap-1"
                                  }
                                >
                                  {option}
                                  <button onClick={() => state.remove(option)}>
                                    X
                                  </button>
                                </span>
                              )}
                            </For>
                          </div>
                        )}
                      </SelectValue>
                    </As>
                  </SelectTrigger>
                  <Select.Portal>
                    <SelectContent>
                      <Select.Listbox />
                    </SelectContent>
                  </Select.Portal>
                </SelectRoot>
              )}
            </Show>
          </div>
        </div>
      </div>
      <Separator />
      <div class={"grid grid-cols-6 gap-2 row-auto"}>
        <Show when={files()}>
          {(files) => (
            <For each={files()}>
              {(file) => (
                <div>
                  <img src={CDN_URL + file.path} />
                </div>
              )}
            </For>
          )}
        </Show>
      </div>
      <Button
        disabled={pageData.isFetchingNextPage}
        onClick={() => {
          if (pageData.hasNextPage) pageData.fetchNextPage();
        }}
      >
        Load More
      </Button>
    </div>
  );
};

export default Index;

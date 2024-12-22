import type { _Object } from "@aws-sdk/client-s3";
import { Title } from "@solidjs/meta";
import {
  createMutation,
  createQuery,
  useQueryClient,
} from "@tanstack/solid-query";
import { For, Match, Show, Switch, createEffect, createSignal } from "solid-js";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Save } from "~/icons";
import { api } from "~/lib/api";
import { chunk } from "~/lib/chunk";
import { cn } from "~/lib/utils";
import { useTags } from "~/queries/useTags";

const MAX_FILES_LIMIT = 10;
const FETCH_WHEN_LESSTHAN = 1;
const CDN_URL = import.meta.env.VITE_S3_IMAGE_PROXY_URL ?? "";

export default function Tagger() {
  const queryClient = useQueryClient();
  let tagInputRef: HTMLInputElement = null!;
  const [startAfter, setStartAfter] = createSignal("");
  const [newTag, setNewTag] = createSignal("");
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);

  const tags = useTags();

  const createTag = createMutation(() => ({
    mutationKey: ["tags", "create"],
    mutationFn: () => api.tags.create.mutate({ name: newTag() }),
    onSuccess: () => {
      tags.refetch();
      setNewTag("");
    },
  }));

  const files = createQuery(() => ({
    queryKey: ["files", MAX_FILES_LIMIT, startAfter()],
    queryFn: () => {
      return api.files.get.query({
        limit: MAX_FILES_LIMIT,
        startAfter: startAfter(),
      });
    },
    staleTime: Infinity,
  }));

  const setLastViewed = createMutation<any, any, { startAfter: string }>(
    () => ({
      mutationKey: ["files", "setLastViewed"],
      mutationFn: ({ startAfter }) => {
        return api.files.setLastViewed.mutate({ startAfter });
      },
    }),
  );

  const removeTagFromImage = createMutation<
    any,
    any,
    { imageIdx: number; tag: string }
  >(() => ({
    mutationKey: ["files", "removeTag"],
    mutationFn: ({ imageIdx, tag }) => {
      const image = files.data![imageIdx]!;
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
      return api.files.removeTag.mutate({ image: image.Key!, tag });
    },
  }));

  const addTagToImage = createMutation<
    any,
    any,
    { imageIdx: number; tag: string }
  >(() => ({
    mutationKey: ["files", "addTag"],
    mutationFn: ({ imageIdx, tag }) => {
      const image = files.data![imageIdx]!;
      setSelectedTags((prev) => [...prev, tag]);
      return api.files.addTag.mutate({ image: image.Key!, tag });
    },
  }));

  const [currentImageIdx, setCurrentImageIdx] = createSignal(0);

  const handleNextPage = () => {
    setCurrentImageIdx((prev) => prev + 1);
    setSelectedTags([]);
  };

  // TODO: Work out how to preload the next page without fucking up
  // when is already in the tanstack query cacheo
  // preload should happen when there is less than FETCH_WHEN_LESSTHAN
  // leave in the current cache
  createEffect(async () => {
    if (files.data && files.data) {
      const lastImage = files.data[files.data.length - 1];
      if (!lastImage) return;
      if (currentImageIdx() === files.data.length) {
        setStartAfter(lastImage.Key!);
        setCurrentImageIdx(0);
      } else if (
        currentImageIdx() + FETCH_WHEN_LESSTHAN >=
        files.data?.length
      ) {
        const next = await queryClient.ensureQueryData({
          queryKey: ["files", MAX_FILES_LIMIT, lastImage.Key!],
          queryFn: () =>
            api.files.get.query({
              limit: MAX_FILES_LIMIT,
              startAfter: lastImage.Key!,
            }),
        });
        if (!next) {
          console.log("no more files");
          return;
        }
        const chunks = chunk(next, 5);
        for (const chunk of chunks) {
          const loaders = chunk.map((file) => {
            return new Promise<void>((resolve, reject) => {
              // Force browser to load images
              const img = new Image();
              img.onload = () => {
                resolve();
              };

              img.onerror = () => {
                reject();
              };
              img.src = CDN_URL + file.Key;
            });
          });

          await Promise.all(loaders);
          console.log("loaded images");
        }
      }
    }
  });

  return (
    <main>
      <Title>eyes 👀</Title>

      <div class={"flex flex-col gap-6 items-center justify-center"}>
        <div class={"flex flex-wrap items-center justify-center"}>
          <Show when={files.data}>
            {(data) => (
              <For each={data()}>
                {(file, idx) => (
                  <Show when={idx() === currentImageIdx()}>
                    <div class={"mt-6"}>
                      <Switch
                        fallback={
                          // Assume image for now, should change later but oh well
                          <img
                            height={"500px"}
                            src={CDN_URL + file.Key}
                            class={"h-[70vh]"}
                          />
                        }
                      >
                        <Match when={file.Key?.endsWith("mp4")}>
                          <video
                            controls
                            height={"500px"}
                            class={"h-[70vh]"}
                            src={CDN_URL + file.Key}
                          />
                        </Match>
                      </Switch>
                    </div>
                  </Show>
                )}
              </For>
            )}
          </Show>
        </div>
        <div class={"flex flex-col w-1/4 items-center justify-center gap-4"}>
          <p>Tags</p>
          <div class={"flex gap-2"}>
            <For each={tags.data}>
              {(tag) => (
                <Button
                  class={cn({
                    "bg-primary text-primary-foreground":
                      selectedTags().includes(tag),
                    "bg-primary-foreground text-primary":
                      !selectedTags().includes(tag),
                  })}
                  onClick={(e) => {
                    e.preventDefault();
                    if (selectedTags().includes(tag)) {
                      removeTagFromImage.mutate({
                        imageIdx: currentImageIdx(),
                        tag,
                      });
                    } else {
                      addTagToImage.mutate({
                        imageIdx: currentImageIdx(),
                        tag,
                      });
                    }
                    setLastViewed.mutate({
                      startAfter: files.data![currentImageIdx()].Key!,
                    });
                  }}
                >
                  {tag}
                </Button>
              )}
            </For>
          </div>
          <Separator class={"w-32"} />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await createTag.mutateAsync();
              tagInputRef.focus();
            }}
          >
            <fieldset disabled={createTag.isPending}>
              <div class={"flex gap-2 items-center"}>
                <Input
                  ref={tagInputRef}
                  placeholder={"Create a tag"}
                  onChange={(e) => setNewTag(e.target.value)}
                  value={newTag()}
                />
                <Button size={"icon"} type={"submit"}>
                  <Save />
                </Button>
              </div>
            </fieldset>
          </form>
        </div>

        <div class={"flex flex-wrap items-center justify-center"}>
          <Button onClick={handleNextPage}>Next</Button>
        </div>
      </div>
    </main>
  );
}

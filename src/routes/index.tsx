import { _Object } from "@aws-sdk/client-s3";
import { Title } from "@solidjs/meta";
import { createQuery } from "@tanstack/solid-query";
import { For, Show, createEffect, createSignal } from "solid-js";
import { Button } from "~/components/ui/button";
import { api } from "~/lib/api";

const MAX_FILES_LIMIT = 10;
const FETCH_WHEN_LESSTHAN = 2;
const CDN_URL = import.meta.env.VITE_S3_IMAGE_PROXY_URL ?? "";

export default function Home() {
    const [startAfter, setStartAfter] = createSignal("");
    const hello = createQuery(() => ({
        queryKey: ["files", MAX_FILES_LIMIT, startAfter()],
        queryFn: () =>
            api.files.get.query({
                limit: MAX_FILES_LIMIT,
                startAfter: startAfter(),
            }),
    }));

    const [currentImageIdx, setCurrentImageIdx] = createSignal(0);

    // TODO: Work out how to preload the next page without fucking up
    // when is already in the tanstack query cacheo
    // preload should happen when there is less than FETCH_WHEN_LESSTHAN
    // leave in the current cache
    createEffect(() => {
        if (hello.data && hello.data.Contents) {
            if (currentImageIdx() === hello.data.Contents.length) {
                const lastImage = hello.data.Contents[hello.data.Contents.length - 1];
                if (!lastImage) return;
                setStartAfter(lastImage.Key!);
                setCurrentImageIdx(0);
            }
        }
    });

    return (
        <main>
            <Title>eyes 👀</Title>

            <div class={"flex flex-wrap"}>
                <Show when={hello.data}>
                    {(data) => (
                        <For each={data().Contents}>
                            {(file, idx) => (
                                <Show when={idx() === currentImageIdx()}>
                                    <div>
                                        <h3>{file.Key}</h3>
                                        <img width={470} src={CDN_URL + file.Key} />
                                    </div>
                                </Show>
                            )}
                        </For>
                    )}
                </Show>
            </div>
            <Button onClick={() => setCurrentImageIdx((prev) => prev + 1)}>Next</Button>
        </main>
    );
}

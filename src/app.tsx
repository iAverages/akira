// @refresh reload
import { MetaProvider, Title } from "@solidjs/meta";
import { A, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { SolidQueryDevtools } from "@tanstack/solid-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import "@fontsource/inter";
import "./app.css";
import { getCookie } from "vinxi/http";
import { ColorModeProvider, ColorModeScript, cookieStorageManagerSSR } from "@kobalte/core";
import { isServer } from "solid-js/web";

function getServerCookies() {
    "use server";
    const colorMode = getCookie("kb-color-mode");
    return colorMode ? `kb-color-mode=${colorMode}` : "";
}

export default function App() {
    const queryClient = new QueryClient();
    const storageManager = cookieStorageManagerSSR(isServer ? getServerCookies() : document.cookie);

    return (
        <QueryClientProvider client={queryClient}>
            <SolidQueryDevtools />
            <Router
                root={(props) => (
                    <MetaProvider>
                        <ColorModeScript storageType={storageManager.type} />
                        <ColorModeProvider storageManager={storageManager}>
                            <Title>SolidStart - Basic</Title>
                            <Suspense>{props.children}</Suspense>
                        </ColorModeProvider>
                    </MetaProvider>
                )}>
                <FileRoutes />
            </Router>
        </QueryClientProvider>
    );
}

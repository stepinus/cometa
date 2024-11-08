interface ImportMetaEnv {
    readonly VITE_APP_OPENAI_API_BASE: string;
    readonly VITE_APP_OPENAI_API_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

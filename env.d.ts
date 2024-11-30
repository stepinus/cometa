interface ImportMetaEnv {
    readonly VITE_APP_OPENAI_API_BASE: string;
    readonly VITE_APP_OPENAI_API_KEY: string;
    readonly VITE_APP_OPENAI_API_BASE2: string;
    readonly VITE_APP_OPENAI_API_KEY2: string;
    readonly VITE_APP_COMETA_API_KEY: string;
    readonly VITE_APP_DEEPGRAM_API_KEY: string;
    readonly VITE_APP_SALUTE:string;
    readonly VITE_APP_MODEL:string;
    readonly VITE_APP_WAKEWORD:string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

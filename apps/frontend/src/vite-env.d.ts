/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Адрес бэкенда. См. src/api/config.ts и .env.example. */
    readonly VITE_API_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

/**
 * Адрес бэкенда. Берётся из переменной окружения VITE_API_URL
 * (задаётся в .env, см. .env.example в корне apps/frontend), а если
 * её нет — используется адрес локального сервера разработки
 * (`uvicorn app.main:app --reload` слушает именно на этом порту).
 */
export const API_BASE_URL: string =
    import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

import { useEffect, useEffectEvent, useState } from "react";

type Loaded<T> = {
    key: string;
    reload: number;
    data: T | null;
    error: Error | null;
};

export type AsyncResource<T> = {
    /** Данные для текущего ключа; пока они грузятся — null. */
    data: T | null;

    /**
     * Последние успешно загруженные данные, даже если они от прежнего
     * ключа (например, предыдущая страница списка). Позволяет не
     * "мигать" пустым экраном при переключении фильтров.
     */
    previousData: T | null;

    error: Error | null;
    isLoading: boolean;
    reload: () => void;
};

/**
 * Загружает данные при смене key и при вызове reload(). Ответ на
 * устаревший запрос (ключ уже сменился) отбрасывается — быстрые
 * переключения фильтров не могут показать результат "не того" запроса.
 *
 * Состояние загрузки не хранится отдельным флагом, а выводится из
 * сравнения ключа последнего ответа с текущим: так эффект не вызывает
 * setState синхронно, а только в ответе на запрос.
 */
export function useAsyncResource<T>(
    key: string,
    load: () => Promise<T>
): AsyncResource<T> {
    const [state, setState] = useState<Loaded<T>>({
        key: "",
        reload: -1,
        data: null,
        error: null,
    });
    const [reloadCounter, setReloadCounter] = useState(0);

    // Всегда вызывает самую свежую load, но не входит в зависимости
    // эффекта: иначе новая функция на каждый рендер запускала бы запрос
    // снова и снова.
    const runLoad = useEffectEvent(load);

    useEffect(() => {
        let cancelled = false;

        runLoad().then(
            (data) => {
                if (!cancelled) {
                    setState({
                        key,
                        reload: reloadCounter,
                        data,
                        error: null,
                    });
                }
            },
            (error: unknown) => {
                if (!cancelled) {
                    setState((previous) => ({
                        key,
                        reload: reloadCounter,
                        data: previous.data,
                        error:
                            error instanceof Error
                                ? error
                                : new Error("Не удалось загрузить данные"),
                    }));
                }
            }
        );

        return () => {
            cancelled = true;
        };
    }, [key, reloadCounter]);

    const isCurrent = state.key === key && state.reload === reloadCounter;

    return {
        data: isCurrent && !state.error ? state.data : null,
        previousData: state.data,
        error: isCurrent ? state.error : null,
        isLoading: !isCurrent,
        reload: () => setReloadCounter((counter) => counter + 1),
    };
}

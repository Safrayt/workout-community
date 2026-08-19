import { useEffect, useState } from "react";

type Status = "loading" | "error" | "ready";

const SIMULATED_DELAY_MS = 250;

/**
 * Данные Главной пока приходят синхронно из Context (моковые
 * данные), реального сетевого запроса ещё нет. Тем не менее
 * UX-документ требует предусмотреть loading/error состояния уже
 * сейчас (§27, §38), чтобы при подключении настоящего API карта и
 * Feed не пришлось перестраивать.
 *
 * Загрузка запускается один раз при монтировании. `reload` — точка,
 * куда позже подключится повторный вызов реального API (кнопка
 * "Повторить", смена вкладки и т.п.); вызывается из обработчиков
 * событий, а не из эффекта, поэтому не требует синхронного
 * setState внутри useEffect.
 */
export function useSimulatedLoad() {
    const [status, setStatus] = useState<Status>("loading");

    useEffect(() => {
        const timeout = setTimeout(() => {
            setStatus("ready");
        }, SIMULATED_DELAY_MS);

        return () => clearTimeout(timeout);
    }, []);

    function reload() {
        setStatus("loading");

        setTimeout(() => {
            setStatus("ready");
        }, SIMULATED_DELAY_MS);
    }

    return {
        status,
        retry: reload,
        reload,
    };
}

import { useEffect } from "react";

/**
 * Не даёт экрану погаснуть, пока enabled (во время тренировки телефон
 * лежит на полу и никто его не трогает). Если браузер не умеет — ничего
 * не происходит. Блокировка снимается при сворачивании вкладки, поэтому
 * при возвращении запрашиваем её снова.
 */
export function useWakeLock(enabled: boolean): void {
    useEffect(() => {
        if (!enabled || !("wakeLock" in navigator)) {
            return;
        }

        let sentinel: WakeLockSentinel | null = null;
        let cancelled = false;

        async function request() {
            try {
                const next = await navigator.wakeLock.request("screen");

                if (cancelled) {
                    next.release().catch(() => undefined);
                    return;
                }

                sentinel = next;
            } catch {
                // Не разрешили или не поддерживается — не страшно.
            }
        }

        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                void request();
            }
        }

        void request();
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            cancelled = true;
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
            sentinel?.release().catch(() => undefined);
        };
    }, [enabled]);
}

import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";

import type PlaygroundsMapType from "./PlaygroundsMap";

// MapLibre — самая тяжёлая зависимость сайта. Карта подгружается
// отдельным файлом в момент, когда она реально появляется на экране,
// и не входит в основной бандл: остальной интерфейс страницы
// показывается, не дожидаясь карты.
const PlaygroundsMap = lazy(() => import("./PlaygroundsMap"));

type PlaygroundsMapProps = ComponentProps<typeof PlaygroundsMapType>;

export default function LazyPlaygroundsMap(props: PlaygroundsMapProps) {
    return (
        <Suspense
            fallback={
                <div
                    role="status"
                    aria-label="Загрузка карты"
                    style={{
                        height: props.height ?? "500px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "8px",
                        background: "rgba(127, 127, 127, 0.1)",
                    }}
                >
                    Загрузка карты…
                </div>
            }
        >
            <PlaygroundsMap {...props} />
        </Suspense>
    );
}

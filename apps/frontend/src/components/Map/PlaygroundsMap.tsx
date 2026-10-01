import type { MapMarker } from "../../types/map";

import "../../styles/components/map-popup.css";
import "../../styles/components/map-marker.css";

import { getRatingTier } from "../../constants/playgroundRating";
import {
    EURASIA_MAP_CENTER,
    EURASIA_MAP_ZOOM,
} from "../../constants/map";

import * as maplibregl from "maplibre-gl";

// MapLibre 6 по умолчанию ищет файл web worker рядом с собой
// (./maplibre-gl-worker.mjs относительно текущего скрипта). После
// сборки Vite весь код лежит в одном бандле, такого файла рядом нет —
// worker не стартует, векторные тайлы не разбираются, и на карте
// остаётся только растровая подложка. Поэтому просим Vite собрать
// worker отдельным файлом (?worker&url) и явно передаём его адрес.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";


maplibregl.setWorkerUrl(maplibreWorkerUrl);

/**
 * Базовый стиль карты — OpenFreeMap "Liberty": бесплатные векторные
 * тайлы на основе данных OpenStreetMap, без API-ключа и лимитов
 * запросов. У сервиса нет контрактных гарантий доступности (это
 * общественный проект, а не платная инфраструктура с SLA — см.
 * https://openfreemap.org/tos/), но для портала такого масштаба это
 * приемлемый компромисс. Векторный формат стиля даёт то, чего не
 * было у растровых тайлов OSM: возможность скрывать отдельные слои
 * карты — см. hideBoundaryLayers ниже.
 */
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

type PlaygroundsMapProps = {
    markers: MapMarker[];

    height?: string;

    onMapClick?: (
        latitude: number,
        longitude: number
    ) => void;

    selectedLatitude?: number;

    selectedLongitude?: number;

    onMarkerClick?: (
        marker: MapMarker
    ) => void;

    showDetailsLink?: boolean;

    /** Текст кнопки-ссылки в popup — по умолчанию "Подробнее". */
    detailsLinkLabel?: string;

    /** id маркера, подсвечиваемого при наведении на карточку в списке. */
    hoveredMarkerId?: string;

    /**
     * id выбранного маркера (клик по карточке или по самому маркеру) —
     * визуально подсвечивается на карте (не панорамирует карту).
     */
    selectedMarkerId?: string;

    /**
     * id маркера, к которому нужно панорамировать карту и открыть его
     * popup — выставляется только при выборе площадки кликом по
     * карточке в списке. Клик по самому маркеру на карте карту не
     * масштабирует и не панорамирует — площадка уже видна на экране.
     */
    focusMarkerId?: string;

    /**
     * Номер запроса на фокусировку. Без него повторный запрос на ту же
     * самую площадку игнорируется (id не изменился) — а пользователю
     * нужно, чтобы повторный клик по уже выбранной площадке снова
     * возвращал карту к ней, например, после того как он уехал
     * в другое место или закрыл popup. Увеличивайте число при каждом
     * новом запросе. Для остальных карт не нужен.
     */
    focusRequestId?: number;

    /**
     * Начальный центр карты — только для первого рендера (карта не
     * перецентрируется при изменении этого пропа после монтажа).
     * По умолчанию — обзорный вид всей Евразии с центром над
     * Казахстаном (EURASIA_MAP_CENTER в constants/map.ts): пользователь
     * сам находит нужный регион. Явно переопределяется там, где вид
     * зависит от данных (например, карта одной площадки на странице её
     * деталей центрируется на самой площадке).
     *
     * Формат — [широта, долгота], как и everywhere в проекте; сама
     * MapLibre принимает координаты в обратном порядке
     * ([долгота, широта]) — конвертация делается внутри компонента,
     * наружу порядок координат менять не нужно.
     */
    initialCenter?: [number, number];

    /** Начальный масштаб карты — см. initialCenter. */
    initialZoom?: number;
};

type MarkerVisualState = "default" | "hovered" | "selected";

const MARKER_ICON_SIZE: Record<MarkerVisualState, number> = {
    default: 16,
    hovered: 22,
    selected: 24,
};

/** Цвет метки по умолчанию — совпадает с --color-primary из variables.css. */
const DEFAULT_MARKER_COLOR = "#2f855a";

/**
 * У стиля Liberty (как и у большинства стилей на схеме OpenMapTiles,
 * на которой он основан) слои административных границ помечены
 * словом "boundary" и в id, и в source-layer — по этому признаку их
 * и находим, а не по конкретным жёстко зашитым id слоёв: так правило
 * переживёт правки самого стиля на стороне OpenFreeMap.
 */
function isBoundaryLayer(layer: {
    id: string;
    "source-layer"?: string;
}) {
    const id = layer.id.toLowerCase();
    const sourceLayer = (layer["source-layer"] ?? "").toLowerCase();

    return id.includes("boundary") || sourceLayer.includes("boundary");
}

/**
 * Стиль Liberty по умолчанию показывает для нелатинских названий
 * пару "латиница + оригинал" (например, "Minsk" и "Мінск" в две
 * строки) — заменяем это выражение на "английское название →
 * латинская часть → оригинал". Последний вариант — запасной: для
 * объектов, у которых в данных OpenStreetMap нет английского
 * названия (мелкие населённые пункты), будет показано местное
 * название, иначе подпись пропала бы совсем.
 */
const ENGLISH_ONLY_TEXT_FIELD: maplibregl.ExpressionSpecification = [
    "coalesce",
    ["get", "name_en"],
    ["get", "name:latin"],
    ["get", "name"],
];

/** Минимальное описание слоя стиля — то общее, что нужно и «сырому»
 *  JSON стиля (до создания карты), и уже загруженному в MapLibre. */
type RawStyleLayer = {
    id: string;
    type: string;
    "source-layer"?: string;
    layout?: Record<string, unknown>;
};

type RawStyle = {
    layers?: RawStyleLayer[];
    [key: string]: unknown;
};

/**
 * Скрывает границы и переключает подписи на английские прямо в JSON
 * стиля — до того, как он попадёт в MapLibre. Если поправить стиль
 * уже после создания карты (как раньше — в обработчике события
 * "load"), MapLibre успевает нарисовать один-два кадра с границами и
 * оригинальными названиями, и они на долю секунды мелькают при
 * каждой перезагрузке страницы. Правка "сырого" стиля до создания
 * карты полностью убирает это мелькание — на первом же кадре
 * рисуется уже итоговый вид.
 */
function applyStyleCustomizations(style: RawStyle) {
    for (const layer of style.layers ?? []) {
        if (isBoundaryLayer(layer)) {
            layer.layout = { ...layer.layout, visibility: "none" };
        }

        if (
            layer.type === "symbol" &&
            JSON.stringify(layer.layout?.["text-field"])?.includes(
                "name:nonlatin"
            )
        ) {
            layer.layout = {
                ...layer.layout,
                "text-field": ENGLISH_ONLY_TEXT_FIELD,
            };
        }
    }

    return style;
}

/**
 * Скачивает стиль карты и заранее вносит в него правки (см.
 * applyStyleCustomizations), чтобы MapLibre с первого кадра рисовал
 * уже нужный вид. Если скачать и разобрать стиль не удалось (сеть,
 * блокировщик расширений и т.п.), возвращаем исходный URL — MapLibre
 * загрузит стиль сам, а границы и оригинальные названия спрячет уже
 * после загрузки (см. applyStyleCustomizationsOnMap) — без гарантии,
 * что они не мелькнут на первом кадре, но карта всё равно останется
 * рабочей.
 */
async function loadCustomizedStyle(): Promise<
    maplibregl.StyleSpecification | string
> {
    try {
        const response = await fetch(MAP_STYLE_URL);
        const style = (await response.json()) as RawStyle;

        applyStyleCustomizations(style);

        return style as unknown as maplibregl.StyleSpecification;
    } catch (error) {
        console.error("[PlaygroundsMap]", error);

        return MAP_STYLE_URL;
    }
}

/** Запасной путь: правит уже загруженную в MapLibre карту — нужен,
 *  только если loadCustomizedStyle не смог заранее скачать и
 *  поправить JSON стиля (см. её комментарий). */
function applyStyleCustomizationsOnMap(map: maplibregl.Map) {
    const layers = map.getStyle()?.layers ?? [];

    for (const layer of layers) {
        if (isBoundaryLayer(layer as RawStyleLayer)) {
            map.setLayoutProperty(layer.id, "visibility", "none");
        }

        if (
            layer.type === "symbol" &&
            JSON.stringify(
                map.getLayoutProperty(layer.id, "text-field")
            )?.includes("name:nonlatin")
        ) {
            map.setLayoutProperty(
                layer.id,
                "text-field",
                ENGLISH_ONLY_TEXT_FIELD
            );
        }
    }
}

function createMarkerElement(
    state: MarkerVisualState,
    color: string
): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.className = "playground-marker-icon";

    wrapper.appendChild(document.createElement("span"));

    applyMarkerVisualState(wrapper, state, color);

    return wrapper;
}

/** Обновляет размер/цвет/подсветку уже созданного маркера на месте —
 *  без пересоздания DOM-элемента, чтобы не терять привязанный к нему
 *  popup и обработчики событий. */
function applyMarkerVisualState(
    wrapper: HTMLDivElement,
    state: MarkerVisualState,
    color: string
) {
    const size = MARKER_ICON_SIZE[state];

    const boxShadow =
        state === "selected"
            ? `0 0 0 4px ${color}4D, 0 2px 6px rgba(0, 0, 0, 0.35)`
            : "0 2px 6px rgba(0, 0, 0, 0.35)";

    wrapper.style.width = `${size}px`;
    wrapper.style.height = `${size}px`;

    const dot = wrapper.firstElementChild as HTMLSpanElement | null;

    if (!dot) {
        return;
    }

    dot.className = `playground-marker-icon__dot playground-marker-icon__dot--${state}`;
    dot.style.backgroundColor = color;
    dot.style.boxShadow = boxShadow;
}

function buildRatingBadgeElement(
    rating: number,
    showMax: boolean
): HTMLSpanElement {
    const tier = getRatingTier(rating);

    const badge = document.createElement("span");
    badge.className = "rating-badge";
    badge.title = tier.label;
    badge.style.setProperty("--rating-color", tier.color);

    badge.appendChild(document.createElement("span")).className =
        "rating-badge__dot";

    badge.appendChild(
        document.createTextNode(
            showMax ? `${rating} из 100` : `${rating}`
        )
    );

    return badge;
}

function buildPopupContentElement(
    marker: MapMarker,
    options: {
        showDetailsLink: boolean;
        detailsLinkLabel: string;
        onDetailsClick: () => void;
    }
): HTMLDivElement {
    const root = document.createElement("div");
    root.className = "map-popup";

    if (marker.photoUrl) {
        const photoWrapper = document.createElement("div");
        photoWrapper.className = "map-popup__photo-wrapper";

        const img = document.createElement("img");
        img.src = marker.photoUrl;
        img.alt = marker.title;
        img.className = "map-popup__image";
        photoWrapper.appendChild(img);

        if (marker.rating !== undefined) {
            const ratingWrapper = document.createElement("div");
            ratingWrapper.className = "map-popup__rating";
            ratingWrapper.appendChild(
                buildRatingBadgeElement(marker.rating, false)
            );
            photoWrapper.appendChild(ratingWrapper);
        }

        root.appendChild(photoWrapper);
    }

    const body = document.createElement("div");
    body.className = "map-popup__body";

    const title = document.createElement("p");
    title.className = "map-popup__title";
    title.textContent = marker.title;
    body.appendChild(title);

    if (marker.locality) {
        const locality = document.createElement("p");
        locality.className = "map-popup__locality";
        locality.textContent = marker.locality;
        body.appendChild(locality);
    }

    const meta = document.createElement("div");
    meta.className = "map-popup__meta";

    if (!marker.photoUrl && marker.rating !== undefined) {
        meta.appendChild(buildRatingBadgeElement(marker.rating, false));
    }

    if (marker.shortInfo) {
        const shortInfo = document.createElement("span");
        shortInfo.className = "map-popup__short-info";
        shortInfo.textContent = marker.shortInfo;
        meta.appendChild(shortInfo);
    }

    if (meta.childElementCount > 0) {
        body.appendChild(meta);
    }

    if (options.showDetailsLink) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button button--outline";
        button.textContent = options.detailsLinkLabel;
        button.addEventListener("click", options.onDetailsClick);
        body.appendChild(button);
    }

    root.appendChild(body);

    return root;
}

type MarkerEntry = {
    marker: maplibregl.Marker;
    element: HTMLDivElement;
    popup: maplibregl.Popup;
};

export default function PlaygroundsMap({
    markers,
    height = "500px",
    onMapClick,
    selectedLatitude,
    selectedLongitude,
    onMarkerClick,
    showDetailsLink = true,
    detailsLinkLabel = "Подробнее",
    hoveredMarkerId,
    selectedMarkerId,
    focusMarkerId,
    focusRequestId = 0,
    initialCenter = EURASIA_MAP_CENTER,
    initialZoom = EURASIA_MAP_ZOOM,
}: PlaygroundsMapProps) {
    const navigate = useNavigate();

    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
    const pickerMarkerRef = useRef<maplibregl.Marker | null>(null);
    // Popup, открытый механизмом focusMarkerId, — чтобы закрыть его при
    // выборе другой площадки или при снятии фокуса.
    const focusedPopupRef = useRef<maplibregl.Popup | null>(null);

    // Ключ последнего обработанного запроса: id площадки + номер запроса.
    const previousFocusIdRef = useRef<string | undefined>(undefined);

    // Значения, которые нужны внутри обработчиков событий карты
    // (регистрируются один раз при создании карты), но не должны
    // требовать пересоздания самой карты при каждом изменении —
    // читаем их через ref, а не через замыкание. Сами refs обновляем
    // в эффекте (а не прямо в теле компонента), потому что запись в
    // ref во время рендера — antipattern.
    const onMapClickRef = useRef(onMapClick);
    const onMarkerClickRef = useRef(onMarkerClick);
    const navigateRef = useRef(navigate);
    const showDetailsLinkRef = useRef(showDetailsLink);
    const detailsLinkLabelRef = useRef(detailsLinkLabel);

    useEffect(() => {
        onMapClickRef.current = onMapClick;
        onMarkerClickRef.current = onMarkerClick;
        navigateRef.current = navigate;
        showDetailsLinkRef.current = showDetailsLink;
        detailsLinkLabelRef.current = detailsLinkLabel;
    });

    // Захватываем начальный вид только один раз — при изменении этих
    // пропов после монтажа карта намеренно не перецентрируется
    // (см. initialCenter в типах пропов выше).
    const initialCenterRef = useRef(initialCenter);
    const initialZoomRef = useRef(initialZoom);

    // Остальные эффекты (маркер выбранной точки, маркеры площадок,
    // панорамирование к выбранному) ждут появления карты в mapRef —
    // а мы теперь создаём её асинхронно (см. ниже), поэтому им нужен
    // сигнал в зависимостях, чтобы повторно сработать, как только
    // карта станет готова.
    const [isMapReady, setIsMapReady] = useState(false);

    // Создание карты — один раз при монтаже компонента. Сначала
    // скачиваем и заранее правим стиль (см. loadCustomizedStyle) и
    // только потом создаём саму карту — чтобы границы и оригинальные
    // названия не успевали мелькнуть на первом кадре.
    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        let cancelled = false;
        let map: maplibregl.Map | undefined;
        let resizeObserver: ResizeObserver | undefined;
        let initialFrame: number | undefined;

        loadCustomizedStyle().then((style) => {
            if (cancelled || !containerRef.current) {
                return;
            }

            map = new maplibregl.Map({
                container: containerRef.current,
                style,
                center: [
                    initialCenterRef.current[1],
                    initialCenterRef.current[0],
                ],
                zoom: initialZoomRef.current,
            });

            map.addControl(
                new maplibregl.NavigationControl({ showCompass: false }),
                "top-left"
            );

            // Приложение задумано как плоская 2D-карта без поворота —
            // как и было с Leaflet, который вращения не поддерживал.
            map.dragRotate.disable();
            map.touchZoomRotate.disableRotation();

            // Запасной путь на случай, если loadCustomizedStyle не
            // смог заранее скачать и поправить стиль сам и вернул
            // обычный URL — тогда красим уже загруженную карту (см.
            // комментарий applyStyleCustomizationsOnMap).
            if (typeof style === "string") {
                map.once("load", () =>
                    applyStyleCustomizationsOnMap(map!)
                );
            }

            // Диагностика: если тайлы, шрифты или спрайты стиля не
            // загрузились (блокировщик, сеть, недоступность сервиса),
            // MapLibre молча рисует только то, что удалось получить, —
            // выводим причину в консоль, чтобы её можно было увидеть.
            map.on("error", (event) => {
                console.error("[PlaygroundsMap]", event.error);
            });

            map.on("click", (event) => {
                onMapClickRef.current?.(
                    event.lngLat.lat,
                    event.lngLat.lng
                );
            });

            mapRef.current = map;
            setIsMapReady(true);

            // MapLibre, как и Leaflet, не следит сам за последующим
            // изменением размера своего контейнера (сворачивание
            // соседнего блока, переключение вкладки "Фото/Карта" и
            // т.п.) — заставляем его перемерить контейнер вручную.
            const invalidate = () => map?.resize();
            initialFrame = requestAnimationFrame(invalidate);
            resizeObserver = new ResizeObserver(invalidate);
            resizeObserver.observe(containerRef.current);
        });

        const markersAtMount = markersRef.current;

        return () => {
            cancelled = true;

            if (initialFrame !== undefined) {
                cancelAnimationFrame(initialFrame);
            }

            resizeObserver?.disconnect();
            map?.remove();
            mapRef.current = null;
            markersAtMount.clear();
            pickerMarkerRef.current = null;
        };
    }, []);

    // Маркер выбранной точки — используется формами выбора площадки/
    // координат (создание площадки, привязка записи к площадке и т.п.).
    useEffect(() => {
        const map = mapRef.current;

        if (!map) {
            return;
        }

        if (
            selectedLatitude === undefined ||
            selectedLongitude === undefined
        ) {
            pickerMarkerRef.current?.remove();
            pickerMarkerRef.current = null;
            return;
        }

        if (pickerMarkerRef.current) {
            pickerMarkerRef.current.setLngLat([
                selectedLongitude,
                selectedLatitude,
            ]);
        } else {
            pickerMarkerRef.current = new maplibregl.Marker({
                color: DEFAULT_MARKER_COLOR,
            })
                .setLngLat([selectedLongitude, selectedLatitude])
                .addTo(map);
        }
    }, [selectedLatitude, selectedLongitude, isMapReady]);

    // Основная синхронизация маркеров площадок/мероприятий: добавляем
    // новые, убираем пропавшие, обновляем позицию/подсветку и
    // содержимое popup у оставшихся.
    useEffect(() => {
        const map = mapRef.current;

        if (!map) {
            return;
        }

        const currentIds = new Set(markers.map((marker) => marker.id));

        for (const [id, entry] of markersRef.current) {
            if (!currentIds.has(id)) {
                entry.marker.remove();
                markersRef.current.delete(id);
            }
        }

        for (const markerData of markers) {
            const state: MarkerVisualState =
                markerData.id === selectedMarkerId
                    ? "selected"
                    : markerData.id === hoveredMarkerId
                        ? "hovered"
                        : "default";

            const color = markerData.color ?? DEFAULT_MARKER_COLOR;

            const existing = markersRef.current.get(markerData.id);

            if (existing) {
                existing.marker.setLngLat([
                    markerData.longitude,
                    markerData.latitude,
                ]);
                applyMarkerVisualState(existing.element, state, color);
                existing.popup.setDOMContent(
                    buildPopupContentElement(markerData, {
                        showDetailsLink: showDetailsLinkRef.current,
                        detailsLinkLabel: detailsLinkLabelRef.current,
                        onDetailsClick: () =>
                            navigateRef.current(markerData.url),
                    })
                );
                continue;
            }

            const element = createMarkerElement(state, color);
            element.addEventListener("click", () => {
                onMarkerClickRef.current?.(markerData);
            });

            const popup = new maplibregl.Popup({
                closeButton: true,
                offset: 18,
                // По умолчанию MapLibre при открытии popup (и при
                // каждом setDOMContent) переводит фокус на его кнопку
                // "закрыть", а браузер при этом прокручивает страницу к
                // ней. Если popup находится далеко за пределами
                // видимой части карты (например, при выборе площадки
                // из списка, пока карта приближена к другой), страница
                // "улетала" вверх. Фокус нам не нужен — popup
                // закрывается мышью/крестиком.
                focusAfterOpen: false,
            }).setDOMContent(
                buildPopupContentElement(markerData, {
                    showDetailsLink: showDetailsLinkRef.current,
                    detailsLinkLabel: detailsLinkLabelRef.current,
                    onDetailsClick: () =>
                        navigateRef.current(markerData.url),
                })
            );

            const marker = new maplibregl.Marker({
                element,
                anchor: "center",
            })
                .setLngLat([markerData.longitude, markerData.latitude])
                .setPopup(popup)
                .addTo(map);

            markersRef.current.set(markerData.id, {
                marker,
                element,
                popup,
            });
        }
    }, [markers, selectedMarkerId, hoveredMarkerId, isMapReady]);

    // Панорамирование к выбранному маркеру и открытие его popup —
    // только при выборе площадки кликом по карточке в списке (см.
    // focusMarkerId в типах пропов выше).
    useEffect(() => {
        const map = mapRef.current;

        if (!map) {
            return;
        }

        // Фокус снят (например, выбор площадки отменён) — закрываем
        // popup и сбрасываем запомненный запрос, чтобы следующий
        // выбор той же площадки сработал снова.
        if (!focusMarkerId) {
            focusedPopupRef.current?.remove();
            focusedPopupRef.current = null;
            previousFocusIdRef.current = undefined;
            return;
        }

        const focusKey = `${focusMarkerId}:${focusRequestId}`;

        if (focusKey === previousFocusIdRef.current) {
            return;
        }

        const markerData = markers.find(
            (item) => item.id === focusMarkerId
        );
        const entry = markersRef.current.get(focusMarkerId);

        if (!markerData || !entry) {
            return;
        }

        previousFocusIdRef.current = focusKey;

        // Выбрана другая площадка — popup предыдущей закрываем, чтобы
        // на карте не копились открытые окна.
        if (
            focusedPopupRef.current &&
            focusedPopupRef.current !== entry.popup
        ) {
            focusedPopupRef.current.remove();
        }

        focusedPopupRef.current = entry.popup;

        map.flyTo({
            center: [markerData.longitude, markerData.latitude],
            zoom: Math.max(map.getZoom(), 14),
            duration: 600,
        });

        entry.popup.addTo(map);
    }, [focusMarkerId, focusRequestId, markers, isMapReady]);

    return (
        <div
            ref={containerRef}
            style={{
                height,
                width: "100%",
                borderRadius: "12px",
            }}
        />
    );
}

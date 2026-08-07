import { useState } from "react";

import "../../styles/components/playground-actions.css";

import type { Playground } from "../../types/playground";

import Button from "../ui/Button/Button";
import SoonBadge from "../ui/SoonBadge/SoonBadge";

type Props = {
    playground: Playground;

    isOwner: boolean;

    onEdit: () => void;

    onDelete: () => void;
};

/**
 * Единственное главное действие на странице площадки — "Построить маршрут".
 * Остальное — второстепенные действия рядом с ним, как и требует документ:
 * "Only one Primary CTA exists".
 *
 * На мобильном второстепенных действий слишком много, чтобы уместить их
 * в одну строку без прокрутки, которая плохо считывается на fixed-панели.
 * Поэтому на узких экранах видна только "Поделиться", а остальное уходит
 * в компактное меню "Ещё" (CSS сам решает, что показывать по ширине экрана).
 */
export default function PlaygroundActions({
    playground,
    isOwner,
    onEdit,
    onDelete,
}: Props) {
    const [shareStatus, setShareStatus] = useState<
        "idle" | "copied"
    >("idle");

    const [isMoreOpen, setMoreOpen] = useState(false);

    const routeUrl =
        `https://www.google.com/maps/dir/?api=1&destination=${playground.coordinates.latitude},${playground.coordinates.longitude}`;

    async function handleShare() {
        const shareData = {
            title: playground.name,
            text: `Площадка «${playground.name}» на Workout Community`,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch {
                // Пользователь закрыл системное окно шаринга — ничего не делаем.
            }

            return;
        }

        try {
            await navigator.clipboard.writeText(
                window.location.href
            );

            setShareStatus("copied");

            window.setTimeout(
                () => setShareStatus("idle"),
                2000
            );
        } catch {
            // Буфер обмена недоступен — молча игнорируем.
        }
    }

    const overflowActions = (
        <>
            <span className="playground-actions__soon">
                <Button
                    variant="outline"
                    disabled
                >
                    В избранное
                </Button>

                <SoonBadge />
            </span>

            {
                isOwner && (
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setMoreOpen(false);
                                onEdit();
                            }}
                        >
                            Редактировать
                        </Button>

                        <Button
                            variant="danger"
                            onClick={() => {
                                setMoreOpen(false);
                                onDelete();
                            }}
                        >
                            Удалить
                        </Button>
                    </>
                )
            }
        </>
    );

    return (
        <div className="playground-actions">
            <a
                href={routeUrl}
                target="_blank"
                rel="noreferrer"
                className="playground-actions__primary"
            >
                <Button variant="primary">
                    Построить маршрут
                </Button>
            </a>

            <div className="playground-actions__secondary">
                <Button
                    variant="secondary"
                    onClick={handleShare}
                >
                    {
                        shareStatus === "copied"
                            ? "Ссылка скопирована"
                            : "Поделиться"
                    }
                </Button>

                <div className="playground-actions__overflow-items">
                    {overflowActions}
                </div>

                <Button
                    variant="outline"
                    className="playground-actions__more-trigger"
                    onClick={() => setMoreOpen((open) => !open)}
                >
                    Ещё
                </Button>
            </div>

            {
                isMoreOpen && (
                    <>
                        <button
                            type="button"
                            aria-label="Закрыть меню"
                            className="playground-actions__backdrop"
                            onClick={() => setMoreOpen(false)}
                        />

                        <div className="playground-actions__more-panel">
                            {overflowActions}
                        </div>
                    </>
                )
            }
        </div>
    );
}

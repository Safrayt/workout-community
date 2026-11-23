import { useEffect, useMemo, useState } from "react";

import "../../styles/components/profile-muscle-load.css";

import MuscleMap from "../MuscleMap/MuscleMap";
import MuscleMapLegend from "../MuscleMapLegend/MuscleMapLegend";
import Button from "../ui/Button/Button";

import { getMuscleLoad } from "../../api/diary";
import { muscleGroupLabels, muscleGroups } from "../../constants/muscleGroups";
import type { MuscleLoad } from "../../types/muscleLoad";
import type { MuscleGroupKey } from "../../types/exercise";
import { toLocalIsoDate } from "../../utils/yearActivity";

type Period = "week" | "twoWeeks" | "month";

/** Период — последние N дней, считая сегодняшний. */
const PERIODS: { key: Period; label: string; days: number }[] = [
    { key: "week", label: "Неделя", days: 7 },
    { key: "twoWeeks", label: "2 недели", days: 14 },
    { key: "month", label: "Месяц", days: 30 },
];

type ProfileMuscleLoadProps = {
    userId: string;
    isOwnProfile: boolean;
};

/** Мышцы в порядке сверху вниз по телу, как в списках упражнений. */
function inBodyOrder(keys: MuscleGroupKey[]): MuscleGroupKey[] {
    const set = new Set(keys);

    return muscleGroups.map((group) => group.key).filter((key) => set.has(key));
}

function namesOf(keys: MuscleGroupKey[]): string {
    return inBodyOrder(keys)
        .map((key) => muscleGroupLabels[key])
        .join(", ");
}

/**
 * Карта мышц, которые пользователь нагружал за неделю, две недели или
 * месяц. Мышцы берутся из записей дневника: упражнения из базы в
 * выбранных схемах программ и в выполненных комплексах. Если ни схем, ни
 * комплексов в записях нет, карта остаётся незакрашенной.
 */
export default function ProfileMuscleLoad({
    userId,
    isOwnProfile,
}: ProfileMuscleLoadProps) {
    const [period, setPeriod] = useState<Period>("week");
    const [results, setResults] = useState<Partial<Record<Period, MuscleLoad>>>(
        {}
    );
    const [failedPeriods, setFailedPeriods] = useState<Period[]>([]);

    // Сегодня фиксируем при показе блока: вкладка может стоять открытой
    // много часов, а период считается от дня, когда её открыли.
    const today = useMemo(() => new Date(), []);

    // Другой пользователь — другие данные.
    useEffect(() => {
        setResults({});
        setFailedPeriods([]);
    }, [userId]);

    const hasResult = results[period] !== undefined;
    const hasFailed = failedPeriods.includes(period);

    useEffect(() => {
        if (hasResult || hasFailed) {
            return;
        }

        const days = PERIODS.find((item) => item.key === period)?.days ?? 7;
        const from = new Date(today);

        from.setDate(today.getDate() - (days - 1));

        let cancelled = false;

        getMuscleLoad(userId, toLocalIsoDate(from), toLocalIsoDate(today))
            .then((load) => {
                if (!cancelled) {
                    setResults((current) => ({ ...current, [period]: load }));
                }
            })
            .catch((error: unknown) => {
                console.error("Не удалось загрузить карту мышц:", error);

                if (!cancelled) {
                    setFailedPeriods((current) => [...current, period]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [userId, period, today, hasResult, hasFailed]);

    const load = results[period];
    const hasMuscles =
        load !== undefined &&
        (load.target.length > 0 || load.auxiliary.length > 0);

    function describeEmpty(current: MuscleLoad): string {
        if (current.entriesTotal === 0) {
            return "За этот период в дневнике нет тренировочных записей.";
        }

        return isOwnProfile
            ? "В записях за этот период не указаны схемы программ и выполненные комплексы, поэтому мышцы определить не удалось. Укажите схему программы или комплекс в тренировочной записи, и карта закрасится."
            : "В записях за этот период не указаны схемы программ и выполненные комплексы, поэтому мышцы определить не удалось.";
    }

    return (
        <div className="profile-muscle-load">
            <div
                className="profile-muscle-load__periods"
                role="group"
                aria-label="Период карты мышц"
            >
                {
                    PERIODS.map((item) => (
                        <Button
                            key={item.key}
                            type="button"
                            variant={item.key === period ? "primary" : "outline"}
                            aria-pressed={item.key === period}
                            onClick={() => setPeriod(item.key)}
                        >
                            {item.label}
                        </Button>
                    ))
                }
            </div>

            {
                hasFailed && !load ? (
                    <p className="profile-muscle-load__note">
                        Не удалось загрузить карту мышц. Попробуйте обновить
                        страницу.
                    </p>
                ) : (
                    <div className="profile-muscle-load__body">
                        <div className="profile-muscle-load__map">
                            <MuscleMap
                                targetMuscles={load?.target ?? []}
                                auxiliaryMuscles={load?.auxiliary ?? []}
                            />
                        </div>

                        <div className="profile-muscle-load__text">
                            {
                                !load ? (
                                    <p className="profile-muscle-load__note">
                                        Загружаем…
                                    </p>
                                ) : hasMuscles ? (
                                    <>
                                        <MuscleMapLegend
                                            items={
                                                load.auxiliary.length > 0
                                                    ? ["target", "auxiliary"]
                                                    : ["target"]
                                            }
                                        />

                                        <p>
                                            <strong>Целевые:</strong>{" "}
                                            {namesOf(load.target) || "—"}
                                        </p>

                                        {
                                            load.auxiliary.length > 0 && (
                                                <p>
                                                    <strong>Вспомогательные:</strong>{" "}
                                                    {namesOf(load.auxiliary)}
                                                </p>
                                            )
                                        }

                                        <p className="profile-muscle-load__note">
                                            Записей за период:{" "}
                                            {load.entriesTotal}, из них со схемой
                                            или комплексом: {load.entriesWithData}.
                                            Карта складывается из мышц упражнений
                                            выбранных схем программ и выполненных
                                            комплексов и показывает, что они
                                            нагружают, а не фактический объём.
                                        </p>
                                    </>
                                ) : (
                                    <p className="profile-muscle-load__note">
                                        {describeEmpty(load)}
                                    </p>
                                )
                            }
                        </div>
                    </div>
                )
            }
        </div>
    );
}

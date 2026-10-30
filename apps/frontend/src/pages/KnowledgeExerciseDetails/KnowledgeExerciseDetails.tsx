import { useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { makeDescription } from "../../utils/pageMeta";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import MuscleMap from "../../components/MuscleMap/MuscleMap";
import MuscleMapLegend from "../../components/MuscleMapLegend/MuscleMapLegend";
import ViewSwitch from "../../components/ViewSwitch/ViewSwitch";

import "../../styles/components/exercise-details.css";

import { useIsAdmin } from "../../context/CurrentUserContext";
import { useComplexes } from "../../context/ComplexContext";
import { useExercises } from "../../context/ExerciseContext";
import {
    movementTypeColors,
    movementTypeLabels,
} from "../../constants/movementTypes";
import { muscleGroupLabels } from "../../constants/muscleGroups";

type MediaView = "video" | "muscles";

const MEDIA_VIEW_OPTIONS = [
    { value: "video", label: "Видео" },
    { value: "muscles", label: "Мышцы" },
] as const;

type DetailsBlockProps = {
    title: string;
    children: ReactNode;
};

/** Текстовый блок страницы: заголовок и содержимое. */
function DetailsBlock({ title, children }: DetailsBlockProps) {
    return (
        <section className="exercise-details__block">
            <h3 className="exercise-details__block-title">{title}</h3>

            {children}
        </section>
    );
}

function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="exercise-details__list">
            {
                items.map((item, index) => (
                    <li key={index}>{item}</li>
                ))
            }
        </ul>
    );
}

/**
 * /knowledge/exercises/:id — страница упражнения.
 *
 * Слева — текстовые блоки по образцу описаний упражнений: "Что это
 * такое?", "Преимущества", "Недостатки", "Техника выполнения",
 * "Особенности", "Для кого подходит". Блоки, данных для которых нет, не
 * показываются.
 *
 * Справа (на телефоне — над текстом) — медиа-панель: видео выполнения и
 * карта мышц с переключателем между ними. Если у упражнения нет видео,
 * сразу карта мышц и переключателя нет. Панель при прокрутке остаётся на
 * экране, пока читается длинный текст.
 */
export default function KnowledgeExerciseDetails() {
    const { id } = useParams();
    const location = useLocation();

    // Страница открыта и гостям — они просто не админы.
    const isAdmin = useIsAdmin();
    const { getExerciseById, isLoading } = useExercises();
    const { complexes } = useComplexes();

    const exercise = id ? getExerciseById(id) : undefined;

    // Заголовок вкладки и описание для поиска — по самому упражнению.
    usePageMeta(
        exercise?.name,
        exercise
            ? makeDescription(exercise.description) ||
                  `Упражнение «${exercise.name}»: техника выполнения и целевые мышцы.`
            : undefined
    );

    // В какие комплексы входит упражнение — ссылка в обратную сторону от
    // страницы комплекса (там упражнения — ссылки сюда).
    const usedInComplexes = exercise
        ? complexes.filter((complex) => complex.exerciseIds.includes(exercise.id))
        : [];

    // Что показано в медиа-панели. Видео по умолчанию, если оно есть:
    // по нему сразу понятно, как выполнять упражнение; карта мышц — одним
    // нажатием.
    const [mediaView, setMediaView] = useState<MediaView>("video");

    // Список открывается с теми же фильтрами, с какими из него ушли
    // (карточка передаёт свой адрес в state).
    const listSearch =
        (location.state as { listSearch?: string } | null)?.listSearch ?? "";

    const backLink = (
        <Link
            to={{ pathname: "/knowledge/exercises", search: listSearch }}
            className="exercise-details__back"
        >
            ← К списку упражнений
        </Link>
    );

    // Пока список ещё грузится, "не найдено" показывать нельзя: упражнение
    // есть, просто не доехало.
    if (!exercise && isLoading) {
        return (
            <Section title="Упражнения">
                <p>Загрузка…</p>
            </Section>
        );
    }

    if (!exercise) {
        return (
            <Section title="Упражнения">
                <div className="exercise-details__not-found">
                    <p className="exercise-details__not-found-title">
                        Упражнение не найдено
                    </p>

                    <p>
                        Возможно, ссылка устарела. Вернитесь к списку и выберите
                        упражнение заново.
                    </p>

                    <Link to="/knowledge/exercises">
                        <Button variant="outline">К списку упражнений</Button>
                    </Link>
                </div>
            </Section>
        );
    }

    const {
        name,
        nameEn,
        movementType,
        targetMuscles,
        auxiliaryMuscles,
        equipment,
        description,
        advantages,
        disadvantages,
        technique,
        features,
        suitableFor,
        photoUrl,
        videoUrl,
    } = exercise;

    const movementColor = movementTypeColors[movementType];

    const hasVideo = Boolean(videoUrl);
    const activeMediaView: MediaView = hasVideo ? mediaView : "muscles";

    return (
        <>
            {/* Ссылка стоит над заголовком (Section выводит заголовок
                первым, поэтому она вне Section). Справа от неё —
                "Редактировать", только для администратора. */}
            <div className="exercise-details__top-row">
                <p className="exercise-details__back-row">{backLink}</p>

                {
                    isAdmin && (
                        <Link to={`/knowledge/exercises/${exercise.id}/edit`}>
                            <Button type="button" variant="outline">
                                Редактировать
                            </Button>
                        </Link>
                    )
                }
            </div>

            <Section title={name}>
                {
                    nameEn && (
                        <p className="exercise-details__name-en" lang="en">
                            {nameEn}
                        </p>
                    )
                }

                <div className="exercise-details">
                    <div className="exercise-details__main">
                        <div className="exercise-details__meta">
                            <p>
                                <strong>Тип движения:</strong>{" "}
                                {movementTypeLabels[movementType].toLowerCase()}
                            </p>

                            <p>
                                <strong>Оборудование:</strong>{" "}
                                {equipment.join(", ")}
                            </p>
                        </div>

                        <DetailsBlock title="Что это такое?">
                            <p>{description}</p>
                        </DetailsBlock>

                        {
                            advantages && advantages.length > 0 && (
                                <DetailsBlock title="Преимущества">
                                    <BulletList items={advantages} />
                                </DetailsBlock>
                            )
                        }

                        {
                            disadvantages && disadvantages.length > 0 && (
                                <DetailsBlock title="Недостатки">
                                    <BulletList items={disadvantages} />
                                </DetailsBlock>
                            )
                        }

                        <DetailsBlock title="Техника выполнения">
                            <ol className="exercise-details__steps">
                                {
                                    technique.map((step, index) => (
                                        <li key={index}>{step}</li>
                                    ))
                                }
                            </ol>
                        </DetailsBlock>

                        {
                            features && features.length > 0 && (
                                <DetailsBlock title="Особенности">
                                    <BulletList items={features} />
                                </DetailsBlock>
                            )
                        }

                        {
                            suitableFor && suitableFor.length > 0 && (
                                <DetailsBlock title="Для кого подходит">
                                    <BulletList items={suitableFor} />
                                </DetailsBlock>
                            )
                        }

                        {
                            usedInComplexes.length > 0 && (
                                <DetailsBlock title="Входит в комплексы">
                                    <ul className="exercise-details__list">
                                        {
                                            usedInComplexes.map((complex) => (
                                                <li key={complex.id}>
                                                    <Link to={`/complexes/${complex.id}`}>
                                                        {complex.name}
                                                    </Link>
                                                </li>
                                            ))
                                        }
                                    </ul>
                                </DetailsBlock>
                            )
                        }
                    </div>

                    <aside
                        className="exercise-details__media"
                        style={
                            {
                                "--movement-color": movementColor,
                            } as React.CSSProperties
                        }
                    >
                        {
                            hasVideo && (
                                <ViewSwitch
                                    options={MEDIA_VIEW_OPTIONS}
                                    value={activeMediaView}
                                    onChange={setMediaView}
                                    ariaLabel="Что показывать: видео или мышцы"
                                />
                            )
                        }

                        {
                            activeMediaView === "video" && videoUrl ? (
                                <video
                                    // key — при переходе на другое упражнение
                                    // плеер создаётся заново, а не продолжает
                                    // показывать прежнее видео.
                                    key={videoUrl}
                                    className="exercise-details__video"
                                    // #t=0.1 — чтобы Safari на iPhone показал
                                    // первый кадр вместо чёрного прямоугольника.
                                    src={`${videoUrl}#t=0.1`}
                                    poster={photoUrl}
                                    controls
                                    muted
                                    loop
                                    playsInline
                                    preload="metadata"
                                    aria-label={`Видео: ${name}`}
                                >
                                    Ваш браузер не поддерживает воспроизведение видео.
                                </video>
                            ) : (
                                <>
                                    <div className="exercise-details__map">
                                        <MuscleMap
                                            targetMuscles={targetMuscles}
                                            auxiliaryMuscles={auxiliaryMuscles}
                                        />
                                    </div>

                                    <MuscleMapLegend
                                        items={
                                            auxiliaryMuscles.length > 0
                                                ? ["target", "auxiliary"]
                                                : ["target"]
                                        }
                                    />

                                    <p>
                                        <strong>Целевые:</strong>{" "}
                                        {targetMuscles.map((muscle) => muscleGroupLabels[muscle]).join(", ")}
                                    </p>

                                    {
                                        auxiliaryMuscles.length > 0 && (
                                            <p>
                                                <strong>Вспомогательные:</strong>{" "}
                                                {auxiliaryMuscles.map((muscle) => muscleGroupLabels[muscle]).join(", ")}
                                            </p>
                                        )
                                    }
                                </>
                            )
                        }
                    </aside>
                </div>
            </Section>
        </>
    );
}

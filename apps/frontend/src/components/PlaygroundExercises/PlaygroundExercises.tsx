import { Link } from "react-router-dom";

import InfoSection from "../ui/InfoSection/InfoSection";
import Button from "../ui/Button/Button";

import type { Playground } from "../../types/playground";

type Props = {
    playground: Playground;
};

/**
 * Блок «Что здесь можно делать»: кнопка, которая открывает в новой
 * вкладке базу упражнений уже отфильтрованной по этой площадке (см.
 * параметр ?playground= в utils/exerciseFilters.ts). Сам список не
 * показываем: он длинный, а фильтры, карта мышц и карточки
 * упражнений уже есть на странице базы.
 */
export default function PlaygroundExercises({ playground }: Props) {
    return (
        <InfoSection title="Что здесь можно делать">
            <p>
                Упражнения из базы знаний, которые можно выполнить на
                оборудовании этой площадки.
            </p>

            <Link
                to={`/knowledge/exercises?playground=${encodeURIComponent(
                    playground.id
                )}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <Button variant="outline">
                    Посмотреть доступные упражнения
                </Button>
            </Link>
        </InfoSection>
    );
}

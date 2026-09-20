import "../../styles/components/program-quick-facts.css";

import type { Program, ProgramVersion } from "../../types/program";

type Props = {
    program: Program;

    /** Текущая версия — есть только у уже опубликованной программы
     *  (см. pages/ProgramDetails.tsx). */
    currentVersion?: ProgramVersion;
};

/**
 * Строка "на первый взгляд" сразу под заголовком — тот же паттерн,
 * что у PlaygroundQuickFacts/EventQuickFacts: отвечает на самые частые
 * вопросы о программе без скролла и без чтения структуры целиком.
 * Значения — только числа, без склоняемых слов: смысл понятен и так
 * по подписи над цифрой, а короткое число легче считывается на глаз.
 */
export default function ProgramQuickFacts({ program, currentVersion }: Props) {
    return (
        <ul className="program-quick-facts">
            <li className="program-quick-facts__item">
                <span className="program-quick-facts__label">
                    Тренировок по программе
                </span>

                <span className="program-quick-facts__value">
                    {program.trainingsCount}
                </span>
            </li>

            <li className="program-quick-facts__item">
                <span className="program-quick-facts__label">
                    В избранном
                </span>

                <span className="program-quick-facts__value">
                    {program.favoritesCount}
                </span>
            </li>

            {
                currentVersion?.versionNumber && (
                    <li className="program-quick-facts__item">
                        <span className="program-quick-facts__label">
                            Текущая версия
                        </span>

                        <span className="program-quick-facts__value">
                            {currentVersion.versionNumber}
                        </span>
                    </li>
                )
            }
        </ul>
    );
}


import { Link } from "react-router-dom";

import "../../styles/components/workout-entry-create.css";
import "../../styles/components/add-diary-entry.css";

/**
 * Единая точка входа для создания записи дневника (UX-DIARY-V2 §2,
 * §4, §19.3, §19.4): пользователь сначала решает, что хочет
 * сохранить, а форма подбирается уже под это решение — вместо двух
 * независимых кнопок "Записать тренировку" / "Добавить заметку".
 */
export default function AddDiaryEntry() {
    return (
        <div className="workout-entry-create">

            <Link
                to="/diary"
                className="workout-entry-create__back"
            >
                ← Дневник
            </Link>

            <header className="workout-entry-create__hero">
                <p className="workout-entry-create__eyebrow">
                    Дневник
                </p>

                <h1 className="workout-entry-create__title">
                    Что хотите записать?
                </h1>
            </header>

            <div className="add-diary-entry__options">
                <Link
                    to="/diary/create/workout"
                    className="add-diary-entry__option"
                >
                    <span className="add-diary-entry__option-title">
                        Тренировка
                    </span>

                    <span className="add-diary-entry__option-description">
                        Записать выполненную тренировку.
                    </span>
                </Link>

                <Link
                    to="/diary/create/note"
                    className="add-diary-entry__option"
                >
                    <span className="add-diary-entry__option-title">
                        Заметка
                    </span>

                    <span className="add-diary-entry__option-description">
                        Добавить заметку о тренировочном процессе.
                    </span>
                </Link>
            </div>

        </div>
    );
}

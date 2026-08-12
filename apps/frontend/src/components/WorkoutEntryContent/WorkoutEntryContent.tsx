import "../../styles/components/workout-entry-content.css";

type Props = {

    description?: string;

};

/**
 * Главный блок страницы — текст записи (UX-DIARY-ENTRY §11–13).
 *
 * Это должно читаться как личный дневник, а не как форма: крупный
 * комфортный текст, увеличенный межстрочный интервал, ограниченная
 * ширина строки. Если описания нет — блок не рендерится вовсе,
 * без подписи "Описание:" и пустого места под ней (§13).
 */
export default function WorkoutEntryContent({
    description,
}: Props) {

    if (!description) {
        return null;
    }

    return (

        <div className="workout-entry-content">
            {description}
        </div>

    );

}

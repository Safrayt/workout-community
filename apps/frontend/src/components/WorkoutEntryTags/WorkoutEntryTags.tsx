import "../../styles/components/workout-entry-tags.css";

import TagBadge from "../ui/TagBadge/TagBadge";

type Props = {

    tags?: string[];

};

/**
 * Второстепенный блок тегов (UX-DIARY-ENTRY §14–15).
 *
 * На этом этапе теги чисто информационные — клика по тегу нет,
 * это станет частью отдельной UX-спецификации фильтрации
 * дневника. Если тегов нет, блок полностью скрывается.
 */
export default function WorkoutEntryTags({
    tags,
}: Props) {

    if (!tags || tags.length === 0) {
        return null;
    }

    return (

        <section className="workout-entry-tags">

            <h2 className="workout-entry-tags__title">
                Теги
            </h2>

            <div className="tag-list">
                {
                    tags.map(
                        (tag) => (
                            <TagBadge
                                key={tag}
                                label={tag}
                            />
                        )
                    )
                }
            </div>

        </section>

    );

}

import Section from "../../components/ui/Section/Section";
import ComingSoonPanel from "../../components/ui/ComingSoonPanel/ComingSoonPanel";

/**
 * /knowledge/articles — статьи (раздел "База знаний"). Пока
 * заготовка: структура и навигация готовы, наполнение появится позже.
 */
export default function KnowledgeArticles() {
    return (
        <Section title="Статьи">
            <ComingSoonPanel description="Здесь появятся статьи о тренировках: техника, программы, восстановление и безопасность." />
        </Section>
    );
}

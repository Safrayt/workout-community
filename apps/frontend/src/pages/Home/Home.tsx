import Button from "../../components/ui/Button/Button";
import Card from "../../components/ui/Card/Card";
import Section from "../../components/ui/Section/Section";

export default function Home() {
    return (
        <>
            <Section title="Добро пожаловать!">
                <Card>
                    <p>
                        Workout Community помогает вести дневник тренировок,
                        участвовать в мероприятиях и развиваться вместе с
                        сообществом.
                    </p>

                    <Button>
                        Записать тренировку
                    </Button>
                </Card>
            </Section>

            <Section title="Сегодня для тебя">
                <Card>
                    <p>
                        Самое сложное — начать. Всё остальное становится легче
                        после первого подхода.
                    </p>
                </Card>
            </Section>

            <Section title="Ближайшие тренировки">
                <Card>
                    <p>Пока нет запланированных тренировок.</p>
                </Card>
            </Section>

            <Section title="Продолжить программу">
                <Card>
                    <p>Вы пока не выбрали тренировочную программу.</p>
                </Card>
            </Section>
        </>
    );
}
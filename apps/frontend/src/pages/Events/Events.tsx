import EventCard from "../../components/EventCard/EventCard";
import Section from "../../components/ui/Section/Section";

export default function Events() {
    return (
        <Section title="Ближайшие тренировки">
            <EventCard
                title="Утренняя тренировка"
                location="Workout Park №7"
                date="Суббота • 10:00"
                participants={25}
            />

            <EventCard
                title="Вечерний Street Workout"
                location="Парк Победы"
                date="Воскресенье • 18:00"
                participants={13}
            />
        </Section>
    );
}
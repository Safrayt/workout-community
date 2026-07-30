import Section from "../../components/ui/Section/Section";
import InfoSection from "../../components/ui/InfoSection/InfoSection";

import AchievementCard from "../../components/AchievementCard/AchievementCard";

import { currentUser } from "../../data/currentUser";

import {
    useEvents,
} from "../../context/EventContext";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    useRegistration,
} from "../../context/RegistrationContext";

import {
    getAchievementsProgress,
} from "../../utils/achievements";

export default function Achievements() {

    const {
        events,
    } = useEvents();

    const {
        playgrounds,
    } = usePlaygrounds();

    const {
        registrations,
    } = useRegistration();

    const achievementsProgress =
        getAchievementsProgress(
            currentUser.id,
            events,
            playgrounds,
            registrations
        );

    const unlocked =
        achievementsProgress.filter(
            (item) => item.unlocked
        );

    const locked =
        achievementsProgress.filter(
            (item) => !item.unlocked
        );

    return (

        <Section title="Достижения">

            <InfoSection title="Общий прогресс">

                <p>

                    Открыто

                    {" "}

                    {unlocked.length}

                    {" из "}

                    {achievementsProgress.length}

                </p>

            </InfoSection>

            <InfoSection title="Полученные">

                {
                    unlocked.length === 0
                        ? (
                            <p>
                                Пока нет достижений.
                            </p>
                        )
                        : (
                            <ul>

                                {
                                    unlocked.map(
                                        (item) => (

                                            <AchievementCard

                                                key={
                                                    item.achievement.id
                                                }

                                                achievement={
                                                    item.achievement
                                                }

                                            />

                                        )
                                    )
                                }

                            </ul>
                        )
                }

            </InfoSection>

            <InfoSection title="Ещё не открыты">

                {
                    locked.length === 0
                        ? (
                            <p>
                                Все достижения открыты!
                            </p>
                        )
                        : (
                            <ul>

                                {
                                    locked.map(
                                        (item) => (

                                            <AchievementCard

                                                key={
                                                    item.achievement.id
                                                }

                                                achievement={
                                                    item.achievement
                                                }

                                            />

                                        )
                                    )
                                }

                            </ul>
                        )
                }

            </InfoSection>

        </Section>

    );

}
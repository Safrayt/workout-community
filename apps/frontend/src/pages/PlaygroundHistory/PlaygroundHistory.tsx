import { Link, useParams } from "react-router-dom";

import "../../styles/components/playground-history.css";

import Section from "../../components/ui/Section/Section";
import UserLink from "../../components/UserLink/UserLink";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

import { formatDate } from "../../utils/formatDate";
import { playgroundHistoryEntryLabels } from "../../constants/playgroundHistory";

export default function PlaygroundHistory() {

    const { id } = useParams();

    const { playgrounds } = usePlaygrounds();

    const playground =
        id
            ? getPlaygroundById(playgrounds, id)
            : undefined;

    if (!playground) {

        return (
            <Section title="История площадки">
                <p>
                    Площадка не найдена.
                </p>
            </Section>
        );

    }

    return (

        <Section title={`История: ${playground.name}`}>

            <Link
                to={`/playgrounds/${playground.id}`}
                className="playground-history__back"
            >
                ← Назад к площадке
            </Link>

            <ol className="playground-history">

                {
                    playground.history.map((entry) => (

                        <li
                            key={entry.id}
                            className={
                                `playground-history__entry playground-history__entry--${entry.type}`
                            }
                        >

                            <span className="playground-history__type">
                                {playgroundHistoryEntryLabels[entry.type]}
                            </span>

                            <span className="playground-history__date">
                                {formatDate(entry.date)}
                            </span>

                            <span className="playground-history__user">
                                <UserLink username={entry.username} />
                            </span>

                            {
                                entry.changedFields &&
                                entry.changedFields.length > 0 && (

                                    <span className="playground-history__changes">
                                        Изменено: {entry.changedFields.join(", ")}
                                    </span>

                                )
                            }

                        </li>

                    ))
                }

            </ol>

        </Section>

    );

}

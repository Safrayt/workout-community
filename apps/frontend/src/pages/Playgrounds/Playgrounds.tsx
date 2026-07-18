import Section from "../../components/ui/Section/Section";

import { playgrounds } from "../../data/playgrounds";

import { Link } from "react-router-dom";

export default function Playgrounds() {
    return (
        <Section title="Площадки">
            <h3>Карта</h3>

            <p>
                Здесь позже появится интерактивная карта.
            </p>

            <hr />

            <h3>Все площадки</h3>

            <ul>
                {playgrounds.map((playground) => (
                    <li key={playground.id}>
                        <Link
                            to={`/playgrounds/${playground.id}`}
                        >
                            <strong>
                                {playground.name}
                            </strong>
                        </Link>

                        <br />

                        {playground.locality}
                    </li>
                ))}
            </ul>
        </Section>
    );
}
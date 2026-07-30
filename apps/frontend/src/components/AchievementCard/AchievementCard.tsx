import type {
    Achievement,
} from "../../types/achievement";

import "../../styles/components/AchievementCard.css";

type Props = {

    achievement: Achievement;

};

export default function AchievementCard({

    achievement,

}: Props) {

    return (

        <article className="achievement-card">

            <div className="achievement-header">

                <div className="achievement-icon">

                    {achievement.icon}

                </div>

            </div>

            <div className="achievement-body">

                <h3 className="achievement-title">

                    {achievement.title}

                </h3>

                <p className="achievement-description">

                    {achievement.description}

                </p>

            </div>

            <div className="achievement-footer">

                <span className="achievement-xp">

                    +{achievement.experience} XP

                </span>

            </div>

        </article>

    );

}
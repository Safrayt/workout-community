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
        <div className="achievement-card">

            <div className="achievement-icon">
                {achievement.icon}
            </div>

            <div className="achievement-content">

                <h3>
                    {achievement.title}
                </h3>

                <p>
                    {achievement.description}
                </p>

                <small>
                    +{achievement.experience} XP
                </small>

            </div>

        </div>
    );
}
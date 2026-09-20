import { Link } from "react-router-dom";

import Card from "../ui/Card/Card";
import Button from "../ui/Button/Button";
import Badge from "../ui/Badge/Badge";
import Avatar from "../ui/Avatar/Avatar";

import "../../styles/components/program-card.css";

import type { Program } from "../../types/program";

import { programDifficultyLabels } from "../../constants/programTypes";

type ProgramCardProps = {
    program: Program;
};

export default function ProgramCard({ program }: ProgramCardProps) {
    return (
        <Card className="program-card">
            {
                program.coverUrl && (
                    <img
                        src={program.coverUrl}
                        alt=""
                        className="program-card__cover"
                    />
                )
            }

            <div className="program-card__header">
                <h3 className="program-card__title">{program.title}</h3>
            </div>

            {
                program.difficulty && (
                    <Badge variant="primary">
                        {programDifficultyLabels[program.difficulty]}
                    </Badge>
                )
            }

            <div className="program-card__author">
                <Avatar
                    name={program.authorNickname}
                    avatarUrl={program.authorAvatarUrl}
                    size="sm"
                />
                <span>{program.authorNickname}</span>
            </div>

            {
                program.description && (
                    <p className="program-card__description">
                        {program.description}
                    </p>
                )
            }

            <div className="program-card__stats">
                <span>Тренировок: {program.trainingsCount}</span>
                <span>В избранном: {program.favoritesCount}</span>
            </div>

            <Link to={`/programs/${program.id}`} className="program-card__link">
                <Button variant="outline">Подробнее</Button>
            </Link>
        </Card>
    );
}

import { Link } from "react-router-dom";

import Card from "../ui/Card/Card";
import Button from "../ui/Button/Button";
import Badge from "../ui/Badge/Badge";
import Avatar from "../ui/Avatar/Avatar";

import "../../styles/components/program-card.css";

import type { Program } from "../../types/program";

import {
    programCategoryLabels,
    programDifficultyLabels,
} from "../../constants/programTypes";
import { markdownToPlainText } from "../../utils/markdownPlain";

type ProgramCardProps = {
    program: Program;
};

export default function ProgramCard({ program }: ProgramCardProps) {
    const plainDescription = markdownToPlainText(program.description);

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

            <div className="program-card__badges">
                <Badge
                    variant={
                        program.category === "public" ? "success" : "primary"
                    }
                >
                    {programCategoryLabels[program.category]}
                </Badge>

                {
                    program.difficulty && (
                        <Badge variant="primary">
                            {programDifficultyLabels[program.difficulty]}
                        </Badge>
                    )
                }
            </div>

            <div className="program-card__author">
                <Avatar
                    name={program.authorNickname}
                    avatarUrl={program.authorAvatarUrl}
                    size="sm"
                />
                <span>{program.authorNickname}</span>
            </div>

            {
                // Описание — Markdown: в карточке только его текст.
                plainDescription && (
                    <p className="program-card__description">
                        {plainDescription}
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

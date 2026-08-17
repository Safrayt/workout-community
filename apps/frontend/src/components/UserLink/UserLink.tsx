import { Link } from "react-router-dom";

import "../../styles/components/user-link.css";

type UserLinkProps = {
    username: string;

    /** Показать "@" перед username. По умолчанию — да. */
    withAt?: boolean;

    className?: string;
};

/**
 * Username — единственный публичный идентификатор пользователя в
 * портале (UX-PROFILE §1, §49). Этот компонент — единая точка,
 * через которую в остальном приложении ссылаются на автора события,
 * отзыва и т.д., ведя на его публичный профиль /u/:username.
 */
export default function UserLink({
    username,
    withAt = true,
    className,
}: UserLinkProps) {
    return (
        <Link
            to={`/u/${username}`}
            className={
                className
                    ? `user-link ${className}`
                    : "user-link"
            }
        >
            {withAt ? `@${username}` : username}
        </Link>
    );
}

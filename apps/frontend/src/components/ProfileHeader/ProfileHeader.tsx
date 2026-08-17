import { Link } from "react-router-dom";

import Avatar from "../ui/Avatar/Avatar";
import Button from "../ui/Button/Button";

import SubscribeButton from "../SubscribeButton/SubscribeButton";

import "../../styles/components/profile-header.css";

import { formatRegistrationDate } from "../../utils/username";

type ProfileHeaderProps = {
    userId: string;

    username: string;

    avatarUrl?: string;

    about?: string;

    createdAt: string;

    /** Кнопка редактирования — только для собственного профиля (UX-PROFILE §6, §29). */
    isOwnProfile: boolean;
};

export default function ProfileHeader({
    userId,
    username,
    avatarUrl,
    about,
    createdAt,
    isOwnProfile,
}: ProfileHeaderProps) {
    return (
        <div className="profile-header">
            <Avatar
                name={username}
                avatarUrl={avatarUrl}
                size="lg"
            />

            <div className="profile-header__info">
                <h2 className="profile-header__username">
                    {username}
                </h2>

                {
                    about && (
                        <p className="profile-header__about">
                            {about}
                        </p>
                    )
                }

                <p className="profile-header__registration">
                    {formatRegistrationDate(createdAt)}
                </p>

                {
                    isOwnProfile ? (
                        <Link to="/profile/edit">
                            <Button variant="secondary">
                                Редактировать профиль
                            </Button>
                        </Link>
                    ) : (
                        <SubscribeButton userId={userId} />
                    )
                }
            </div>
        </div>
    );
}

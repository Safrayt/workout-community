import { Link } from "react-router-dom";

import Avatar from "../ui/Avatar/Avatar";

import "../../styles/components/subscriptions-list.css";

import { useUserDirectory } from "../../hooks/useUserDirectory";

type SubscriptionsListProps = {
    userIds: string[];
};

export default function SubscriptionsList({
    userIds,
}: SubscriptionsListProps) {
    const { getUserById } = useUserDirectory();

    return (
        <ul className="subscriptions-list">
            {
                userIds.map((userId) => {
                    const user = getUserById(userId);

                    if (!user) {
                        return null;
                    }

                    return (
                        <li key={userId}>
                            <Link
                                to={`/u/${user.nickname}`}
                                className="subscriptions-list__item"
                            >
                                <Avatar
                                    name={user.nickname}
                                    avatarUrl={user.avatarUrl}
                                    size="sm"
                                />

                                <span>
                                    {user.nickname}
                                </span>
                            </Link>
                        </li>
                    );
                })
            }
        </ul>
    );
}

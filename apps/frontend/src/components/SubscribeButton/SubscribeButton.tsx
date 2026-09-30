import Button from "../ui/Button/Button";

import { useSubscriptions } from "../../context/SubscriptionContext";

type SubscribeButtonProps = {
    userId: string;
};

/**
 * Кнопка подписки/отписки на конкретного пользователя — в профиле
 * (ProfileHeader решает, когда её рендерить, там она не показывается
 * в своём собственном профиле) и в разделе "Пользователи"
 * (AdminUsers, тоже не для своей строки). Подписка — локальное
 * состояние в памяти, без подтверждений: подписаться/отписаться
 * можно в один клик, как лайк или избранное в остальном приложении.
 */
export default function SubscribeButton({
    userId,
}: SubscribeButtonProps) {
    const {
        checkSubscription,
        toggleSubscription,
    } = useSubscriptions();

    const isFollowing = checkSubscription(userId);

    function handleClick() {
        toggleSubscription(userId).catch((error: unknown) => {
            console.error(
                "Не удалось изменить подписку:",
                error
            );
        });
    }

    return (
        <Button
            variant={isFollowing ? "secondary" : "primary"}
            onClick={handleClick}
        >
            {isFollowing ? "Отписаться" : "Подписаться"}
        </Button>
    );
}

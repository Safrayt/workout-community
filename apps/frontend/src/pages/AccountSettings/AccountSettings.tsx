import { useNavigate } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Switch from "../../components/ui/Switch/Switch";
import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";

import "../../styles/components/account-settings.css";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import type { PrivacySettings } from "../../types/privacySettings";

/**
 * /profile/settings — пока только приватность отдельных разделов
 * публичного профиля. Каждый переключатель отвечает за то, видит
 * ли посторонний пользователь этот раздел на /u/:username; сам
 * владелец свои разделы видит всегда, независимо от этих настроек.
 */
export default function AccountSettings() {
    const {
        currentUser,
        setCurrentUser,
    } = useCurrentUser();

    const navigate = useNavigate();

    function updatePrivacy(
        patch: Partial<PrivacySettings>
    ) {
        setCurrentUser({
            ...currentUser,
            privacySettings: {
                ...currentUser.privacySettings,
                ...patch,
            },
        });
    }

    return (
        <Section title="Настройки аккаунта">
            <div className="account-settings">
                <h4 className="account-settings__group-title">
                    Приватность профиля
                </h4>

                <p className="account-settings__group-hint">
                    Эти настройки касаются только того, что видят другие
                    пользователи на твоём публичном профиле. Тебе самому
                    всё остаётся видно всегда.
                </p>

                <div className="account-settings__list">
                    <Switch
                        id="privacy-diary"
                        label="Дневник"
                        description="Разрешить другим смотреть твой дневник тренировок"
                        checked={currentUser.privacySettings.diaryVisible}
                        onChange={(checked) =>
                            updatePrivacy({ diaryVisible: checked })
                        }
                    />

                    <Switch
                        id="privacy-achievements"
                        label="Достижения"
                        description="Разрешить другим видеть твои достижения"
                        checked={currentUser.privacySettings.achievementsVisible}
                        onChange={(checked) =>
                            updatePrivacy({ achievementsVisible: checked })
                        }
                    />

                    <Switch
                        id="privacy-events"
                        label="События"
                        description="Разрешить другим видеть события, в которых ты участник"
                        checked={currentUser.privacySettings.eventsVisible}
                        onChange={(checked) =>
                            updatePrivacy({ eventsVisible: checked })
                        }
                    />

                    <Switch
                        id="privacy-subscriptions"
                        label="Подписки"
                        description="Разрешить другим видеть, на кого ты подписан"
                        checked={currentUser.privacySettings.subscriptionsVisible}
                        onChange={(checked) =>
                            updatePrivacy({ subscriptionsVisible: checked })
                        }
                    />
                </div>
            </div>

            <ActionGroup>
                <Button
                    variant="secondary"
                    onClick={() => navigate("/profile")}
                >
                    Назад в профиль
                </Button>
            </ActionGroup>
        </Section>
    );
}

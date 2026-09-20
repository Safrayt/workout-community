import { useNavigate } from "react-router-dom";
import { useState } from "react";

import Section from "../../components/ui/Section/Section";
import Switch from "../../components/ui/Switch/Switch";
import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";

import "../../styles/components/account-settings.css";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import type { PrivacySettings } from "../../types/privacySettings";

import { downloadDiaryExport } from "../../api/diary";

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

    const [isExporting, setIsExporting] = useState(false);

    async function handleExport() {
        setIsExporting(true);

        try {
            await downloadDiaryExport();
        } catch (error: unknown) {
            console.error("Не удалось скачать записи дневника:", error);
            window.alert("Не удалось скачать записи. Попробуйте ещё раз.");
        } finally {
            setIsExporting(false);
        }
    }

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

                <h4 className="account-settings__group-title">
                    Мои данные
                </h4>

                <p className="account-settings__group-hint">
                    Архив со всеми твоими записями дневника (тренировки и
                    заметки) и прикреплёнными фотографиями.
                </p>

                <Button
                    variant="outline"
                    className="account-settings__export-button"
                    onClick={handleExport}
                    disabled={isExporting}
                >
                    {isExporting ? "Готовим архив…" : "Скачать записи"}
                </Button>
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

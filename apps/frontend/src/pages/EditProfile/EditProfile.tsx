import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Textarea from "../../components/ui/Textarea/Textarea";
import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";

import AvatarUpload from "../../components/AvatarUpload/AvatarUpload";

import "../../styles/components/edit-profile.css";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import { validateAbout } from "../../validation/user";

import { MAX_ABOUT_LENGTH } from "../../constants/user";

/**
 * Редактирование профиля — отдельный экран, а не форма прямо на
 * странице профиля (UX-PROFILE §31).
 *
 * Username здесь намеренно не редактируется: пока в портале нет
 * отдельного маршрута для чужого профиля (/u/:username) и username
 * нигде за пределами Profile не используется как ссылка на
 * пользователя, смена username не даёт того эффекта, который
 * описан в UX-PROFILE §33–34 (обновление адреса профиля), а только
 * создаёт риск путаницы. Как только username станет реальным
 * идентификатором в маршрутизации и в связанных сущностях,
 * редактирование можно вернуть вместе с подтверждением смены.
 */
export default function EditProfile() {
    const {
        currentUser,
        setCurrentUser,
    } = useCurrentUser();

    const navigate = useNavigate();

    const [avatarUrl, setAvatarUrl] =
        useState(currentUser.avatarUrl ?? "");

    const [about, setAbout] =
        useState(currentUser.bio ?? "");

    const [aboutError, setAboutError] =
        useState<string | null>(null);

    function handleSubmit(
        event: React.FormEvent
    ) {
        event.preventDefault();

        const aboutValidationError =
            validateAbout(about);

        setAboutError(aboutValidationError);

        if (aboutValidationError) {
            return;
        }

        setCurrentUser({
            ...currentUser,
            avatarUrl: avatarUrl || undefined,
            bio: about.trim(),
        });

        navigate("/profile");
    }

    return (
        <Section title="Редактирование профиля">
            <form
                className="edit-profile"
                onSubmit={handleSubmit}
            >
                <AvatarUpload
                    username={currentUser.nickname}
                    avatarUrl={avatarUrl}
                    onChange={setAvatarUrl}
                />

                <div className="edit-profile__username-field">
                    <span className="edit-profile__username-label">
                        Username
                    </span>

                    <span className="edit-profile__username-value">
                        {currentUser.nickname}
                    </span>

                    <p className="edit-profile__hint">
                        Username сейчас нельзя изменить.
                    </p>
                </div>

                <div className="edit-profile__about-field">
                    <Textarea
                        id="about"
                        label="О себе"
                        placeholder="Например: тренируюсь на турниках и брусьях."
                        value={about}
                        error={aboutError ?? undefined}
                        onChange={(event) => {
                            setAbout(event.target.value);
                            setAboutError(null);
                        }}
                    />

                    <p className="edit-profile__hint">
                        {about.length} / {MAX_ABOUT_LENGTH}
                    </p>
                </div>

                <ActionGroup>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate("/profile")}
                    >
                        Отмена
                    </Button>

                    <Button type="submit">
                        Сохранить
                    </Button>
                </ActionGroup>
            </form>
        </Section>
    );
}

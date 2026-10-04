import { useState } from "react";

import Input from "../ui/Input/Input";
import Button from "../ui/Button/Button";
import RecoveryKeyPanel from "../RecoveryKeyPanel/RecoveryKeyPanel";

import "../../styles/components/security-settings.css";

import { useAuth, useCurrentUser } from "../../context/CurrentUserContext";

import { changePassword, createRecoveryKey } from "../../api/auth";
import { ApiError } from "../../api/errors";

const MIN_PASSWORD_LENGTH = 8;

type KeyMode = "idle" | "confirm" | "show";

/**
 * Раздел "Безопасность" в настройках аккаунта: смена пароля и ключ
 * восстановления доступа. Оба действия требуют текущий пароль — чтобы
 * тот, кто получил доступ к уже открытой сессии, не мог навсегда
 * закрепить аккаунт за собой.
 */
export default function SecuritySettings() {
    const { currentUser } = useCurrentUser();
    const { setUser } = useAuth();

    // --- Смена пароля ---
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isPasswordChanged, setIsPasswordChanged] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // --- Ключ восстановления ---
    const [keyMode, setKeyMode] = useState<KeyMode>("idle");
    const [keyPassword, setKeyPassword] = useState("");
    const [keyError, setKeyError] = useState<string | null>(null);
    const [isCreatingKey, setIsCreatingKey] = useState(false);
    const [issuedKey, setIssuedKey] = useState<string | null>(null);

    async function handleChangePassword(event: React.FormEvent) {
        event.preventDefault();

        setIsPasswordChanged(false);

        if (!currentPassword) {
            setPasswordError("Введите текущий пароль.");
            return;
        }

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setPasswordError(
                `Новый пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`
            );
            return;
        }

        if (newPassword !== repeatPassword) {
            setPasswordError("Пароли не совпадают.");
            return;
        }

        setPasswordError(null);
        setIsChangingPassword(true);

        try {
            await changePassword(currentPassword, newPassword);

            setCurrentPassword("");
            setNewPassword("");
            setRepeatPassword("");
            setIsPasswordChanged(true);
        } catch (err) {
            setPasswordError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось сменить пароль. Попробуйте ещё раз."
            );
        } finally {
            setIsChangingPassword(false);
        }
    }

    async function handleCreateKey(event: React.FormEvent) {
        event.preventDefault();

        if (!keyPassword) {
            setKeyError("Введите текущий пароль.");
            return;
        }

        setKeyError(null);
        setIsCreatingKey(true);

        try {
            const recoveryKey = await createRecoveryKey(keyPassword);

            setIssuedKey(recoveryKey);
            setKeyPassword("");
            setKeyMode("show");

            // Обновляем только в памяти — на сервере признак наличия
            // ключа уже выставлен самим запросом выше.
            setUser((previous) =>
                previous ? { ...previous, hasRecoveryKey: true } : previous
            );
        } catch (err) {
            setKeyError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось создать ключ. Попробуйте ещё раз."
            );
        } finally {
            setIsCreatingKey(false);
        }
    }

    function closeKeyForm() {
        setKeyMode("idle");
        setKeyPassword("");
        setKeyError(null);
    }

    const hasKey = currentUser.hasRecoveryKey === true;

    return (
        <>
            <h4 className="account-settings__group-title">
                Безопасность
            </h4>

            <h5 className="security-settings__subtitle">Пароль</h5>

            <form
                className="security-settings__form"
                onSubmit={handleChangePassword}
            >
                <Input
                    id="security-current-password"
                    label="Текущий пароль"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                />

                <Input
                    id="security-new-password"
                    label="Новый пароль"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                />

                <Input
                    id="security-repeat-password"
                    label="Повторите новый пароль"
                    type="password"
                    autoComplete="new-password"
                    value={repeatPassword}
                    onChange={(event) => setRepeatPassword(event.target.value)}
                />

                {passwordError && (
                    <p className="security-settings__error" role="alert">
                        {passwordError}
                    </p>
                )}

                {isPasswordChanged && (
                    <p className="security-settings__success" role="status">
                        Пароль изменён. На других устройствах потребуется
                        войти заново.
                    </p>
                )}

                <Button
                    type="submit"
                    variant="outline"
                    className="security-settings__button"
                    disabled={isChangingPassword}
                >
                    {isChangingPassword ? "Сохраняем…" : "Сменить пароль"}
                </Button>
            </form>

            <h5 className="security-settings__subtitle">
                Ключ восстановления
            </h5>

            {keyMode === "show" && issuedKey ? (
                <RecoveryKeyPanel
                    recoveryKey={issuedKey}
                    nickname={currentUser.nickname}
                    confirmLabel="Готово"
                    onConfirm={() => {
                        setIssuedKey(null);
                        closeKeyForm();
                    }}
                />
            ) : (
                <>
                    <p className="account-settings__group-hint">
                        {hasKey
                            ? "Ключ создан. С его помощью можно восстановить доступ, если вы забудете пароль. Если вы потеряли ключ или он мог попасть к другим людям — создайте новый: прежний сразу перестанет работать."
                            : "Ключа восстановления нет. Без него при потере пароля вернуть аккаунт не получится: на портале нет почты и других контактов. Создайте ключ и сохраните его."}
                    </p>

                    {keyMode === "confirm" ? (
                        <form
                            className="security-settings__form"
                            onSubmit={handleCreateKey}
                        >
                            <Input
                                id="security-key-password"
                                label="Текущий пароль"
                                type="password"
                                autoComplete="current-password"
                                value={keyPassword}
                                onChange={(event) =>
                                    setKeyPassword(event.target.value)
                                }
                            />

                            {keyError && (
                                <p
                                    className="security-settings__error"
                                    role="alert"
                                >
                                    {keyError}
                                </p>
                            )}

                            <div className="security-settings__buttons">
                                <Button
                                    type="submit"
                                    variant="outline"
                                    className="security-settings__button"
                                    disabled={isCreatingKey}
                                >
                                    {isCreatingKey
                                        ? "Создаём…"
                                        : hasKey
                                            ? "Создать новый ключ"
                                            : "Создать ключ"}
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="security-settings__button"
                                    disabled={isCreatingKey}
                                    onClick={closeKeyForm}
                                >
                                    Отмена
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            className="security-settings__button"
                            onClick={() => setKeyMode("confirm")}
                        >
                            {hasKey ? "Создать новый ключ" : "Создать ключ"}
                        </Button>
                    )}
                </>
            )}
        </>
    );
}

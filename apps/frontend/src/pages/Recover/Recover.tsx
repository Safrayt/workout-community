import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import RecoveryKeyPanel from "../../components/RecoveryKeyPanel/RecoveryKeyPanel";

import { useAuth } from "../../context/CurrentUserContext";
import { ApiError } from "../../api/errors";

import "../../styles/components/auth-form.css";

const MIN_PASSWORD_LENGTH = 8;

/**
 * /recover — восстановление доступа по ключу восстановления, который
 * выдавался при регистрации. Почты на портале нет, поэтому ключ —
 * единственное, чем можно подтвердить, что аккаунт ваш. После успеха
 * человек сразу входит в аккаунт, а использованный ключ заменяется
 * новым, который нужно сохранить.
 */
export default function Recover() {
    const { recover } = useAuth();
    const navigate = useNavigate();

    const [nickname, setNickname] = useState("");
    const [recoveryKey, setRecoveryKey] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Новый ключ после успешного восстановления. Пока он показан,
    // человек уже вошёл в аккаунт — но на главную его отправляем только
    // после того, как он подтвердит, что сохранил ключ.
    const [newRecoveryKey, setNewRecoveryKey] = useState<string | null>(null);

    function validate(): string | null {
        if (!nickname.trim()) return "Введите username.";
        if (!recoveryKey.trim()) return "Введите ключ восстановления.";
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            return `Новый пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`;
        }
        if (newPassword !== repeatPassword) {
            return "Пароли не совпадают.";
        }

        return null;
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const validationError = validate();

        if (validationError) {
            setError(validationError);
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const issuedKey = await recover(
                nickname.trim(),
                recoveryKey,
                newPassword
            );

            setNewRecoveryKey(issuedKey);
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось восстановить доступ. Попробуйте ещё раз."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    if (newRecoveryKey) {
        return (
            <div className="auth-page auth-page--wide">
                <Section title="Доступ восстановлен">
                    <p className="auth-form__hint">
                        Пароль изменён, вы вошли в аккаунт. Использованный
                        ключ больше не действует — вот новый.
                    </p>

                    <RecoveryKeyPanel
                        recoveryKey={newRecoveryKey}
                        nickname={nickname.trim()}
                        confirmLabel="Перейти на портал"
                        onConfirm={() => navigate("/", { replace: true })}
                    />
                </Section>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <Section title="Восстановление доступа">
                <form className="auth-form" onSubmit={handleSubmit}>
                    <p className="auth-form__hint">
                        Введите username, ключ восстановления, который
                        вы сохранили при регистрации, и новый пароль.
                    </p>

                    <Input
                        id="recover-nickname"
                        label="Username"
                        autoComplete="username"
                        value={nickname}
                        onChange={(event) => setNickname(event.target.value)}
                    />

                    <Input
                        id="recover-key"
                        label="Ключ восстановления"
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                        value={recoveryKey}
                        onChange={(event) => setRecoveryKey(event.target.value)}
                    />

                    <Input
                        id="recover-new-password"
                        label="Новый пароль"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                    />

                    <Input
                        id="recover-repeat-password"
                        label="Повторите новый пароль"
                        type="password"
                        autoComplete="new-password"
                        value={repeatPassword}
                        onChange={(event) =>
                            setRepeatPassword(event.target.value)
                        }
                    />

                    {error && (
                        <p className="auth-form__error" role="alert">
                            {error}
                        </p>
                    )}

                    <ActionGroup>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? "Восстанавливаем…"
                                : "Восстановить доступ"}
                        </Button>
                    </ActionGroup>

                    <p className="auth-form__hint">
                        Нет ключа? Портал не хранит почту и другие
                        контакты, поэтому без ключа подтвердить, что
                        аккаунт ваш, невозможно. Если вы помните пароль,
                        после входа в настройках можно создать новый ключ.
                    </p>

                    <p className="auth-form__hint">
                        <Link to="/login">Вернуться ко входу</Link>
                    </p>
                </form>
            </Section>
        </div>
    );
}

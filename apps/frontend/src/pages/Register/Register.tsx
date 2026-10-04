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

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [nickname, setNickname] = useState("");
    const [password, setPassword] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Ключ восстановления, выданный при регистрации. Пока он показан,
    // аккаунт уже создан и вход выполнен, но на главную человека
    // отправляем только после подтверждения, что ключ сохранён —
    // потом посмотреть его будет нельзя.
    const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

    function validate(): string | null {
        if (!nickname.trim()) return "Введите username.";
        if (!/^[a-zA-Z0-9_]+$/.test(nickname.trim())) {
            return "Username может содержать только латинские буквы, цифры и подчёркивание.";
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`;
        }
        if (!agreedToTerms) {
            return "Нужно принять пользовательское соглашение и политику конфиденциальности.";
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
            const issuedKey = await register({
                nickname: nickname.trim(),
                password,
            });

            setRecoveryKey(issuedKey);
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось зарегистрироваться. Попробуйте ещё раз."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    if (recoveryKey) {
        return (
            <div className="auth-page auth-page--wide">
                <Section title="Сохраните ключ восстановления">
                    <RecoveryKeyPanel
                        recoveryKey={recoveryKey}
                        nickname={nickname.trim()}
                        confirmLabel="Продолжить"
                        onConfirm={() => navigate("/", { replace: true })}
                    />
                </Section>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <Section title="Регистрация">
                <form className="auth-form" onSubmit={handleSubmit}>
                    <Input
                        id="register-nickname"
                        label="Username"
                        autoComplete="username"
                        value={nickname}
                        onChange={(event) => setNickname(event.target.value)}
                    />

                    <Input
                        id="register-password"
                        label="Пароль"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />

                    <label className="auth-form__checkbox">
                        <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(event) =>
                                setAgreedToTerms(event.target.checked)
                            }
                        />
                        <span>
                            Я принимаю{" "}
                            <Link to="/terms" target="_blank">
                                пользовательское соглашение
                            </Link>{" "}
                            и{" "}
                            <Link to="/privacy" target="_blank">
                                политику конфиденциальности
                            </Link>
                        </span>
                    </label>

                    {error && (
                        <p className="auth-form__error" role="alert">
                            {error}
                        </p>
                    )}

                    <ActionGroup>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? "Создаём аккаунт…"
                                : "Зарегистрироваться"}
                        </Button>
                    </ActionGroup>

                    <p className="auth-form__hint">
                        Уже есть аккаунт? <Link to="/login">Войти</Link>
                    </p>
                </form>
            </Section>
        </div>
    );
}

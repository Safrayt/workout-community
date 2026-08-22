import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";

import { useAuth } from "../../context/CurrentUserContext";
import { ApiError } from "../../api/errors";

import "../../styles/components/auth-form.css";

const MIN_PASSWORD_LENGTH = 8;

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [nickname, setNickname] = useState("");
    const [locality, setLocality] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function validate(): string | null {
        if (!name.trim()) return "Введите имя.";
        if (!nickname.trim()) return "Введите username.";
        if (!/^[a-zA-Z0-9_]+$/.test(nickname.trim())) {
            return "Username может содержать только латинские буквы, цифры и подчёркивание.";
        }
        if (!locality.trim()) return "Укажите город.";
        if (password.length < MIN_PASSWORD_LENGTH) {
            return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`;
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
            await register({
                name: name.trim(),
                nickname: nickname.trim(),
                locality: locality.trim(),
                password,
            });
            navigate("/", { replace: true });
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

    return (
        <Section title="Регистрация">
            <form className="auth-form" onSubmit={handleSubmit}>
                <Input
                    id="register-name"
                    label="Имя"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                />

                <Input
                    id="register-nickname"
                    label="Username"
                    autoComplete="username"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                />

                <Input
                    id="register-locality"
                    label="Город"
                    autoComplete="address-level2"
                    value={locality}
                    onChange={(event) => setLocality(event.target.value)}
                />

                <Input
                    id="register-password"
                    label="Пароль"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                />

                {error && (
                    <p className="auth-form__error" role="alert">
                        {error}
                    </p>
                )}

                <ActionGroup>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Создаём аккаунт…" : "Зарегистрироваться"}
                    </Button>
                </ActionGroup>

                <p className="auth-form__hint">
                    Уже есть аккаунт? <Link to="/login">Войти</Link>
                </p>
            </form>
        </Section>
    );
}

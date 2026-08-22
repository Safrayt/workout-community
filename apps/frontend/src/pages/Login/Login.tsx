import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";

import { useAuth } from "../../context/CurrentUserContext";
import { ApiError } from "../../api/errors";

import "../../styles/components/auth-form.css";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [nickname, setNickname] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Если ProtectedLayout перенаправил сюда с какой-то конкретной
    // страницы (см. state в <Navigate> там), после входа возвращаем
    // человека именно туда, а не всегда на главную.
    const redirectTo =
        (location.state as { from?: string } | null)?.from ?? "/";

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        if (!nickname.trim() || !password) {
            setError("Заполните username и пароль.");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            await login(nickname.trim(), password);
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось войти. Попробуйте ещё раз."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Section title="Вход">
            <form className="auth-form" onSubmit={handleSubmit}>
                <Input
                    id="login-nickname"
                    label="Username"
                    autoComplete="username"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                />

                <Input
                    id="login-password"
                    label="Пароль"
                    type="password"
                    autoComplete="current-password"
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
                        {isSubmitting ? "Входим…" : "Войти"}
                    </Button>
                </ActionGroup>

                <p className="auth-form__hint">
                    Ещё нет аккаунта?{" "}
                    <Link to="/register">Зарегистрироваться</Link>
                </p>
            </form>
        </Section>
    );
}

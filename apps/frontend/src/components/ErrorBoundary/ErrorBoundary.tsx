import { Component, type ErrorInfo, type ReactNode } from "react";

import Button from "../ui/Button/Button";

import "../../styles/components/error-boundary.css";

type ErrorBoundaryProps = {
    children: ReactNode;
};

type ErrorBoundaryState = {
    hasError: boolean;
};

/**
 * Последний рубеж защиты от белого экрана. Без него необработанная
 * ошибка рендера в ЛЮБОМ компоненте дерева (например, обращение к
 * полю несуществующего объекта из-за неожиданного ответа API)
 * приводит к тому, что React размонтирует всё приложение и
 * пользователь видит пустую страницу без единой подсказки.
 *
 * Ошибки в обработчиках событий (onClick и т.п.) и в асинхронном
 * коде (например, необработанный reject в useEffect) Error Boundary
 * НЕ ловит — это ограничение React, а не этого компонента. Такие
 * случаи по-прежнему нужно обрабатывать try/catch на месте.
 */
export default class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Пока просто консоль — как только появится Sentry (или
        // аналог), сюда добавится отправка туда. Оставлять пользователя
        // без всякого следа ошибки в проде тоже нельзя, поэтому
        // console.error — временный, но не худший вариант.
        console.error("Необработанная ошибка рендера:", error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <section className="error-boundary">
                    <h1 className="error-boundary__title">
                        Что-то пошло не так
                    </h1>

                    <p className="error-boundary__message">
                        Произошла непредвиденная ошибка. Попробуйте
                        перезагрузить страницу — обычно это помогает.
                    </p>

                    <Button
                        variant="primary"
                        onClick={this.handleReload}
                    >
                        Перезагрузить страницу
                    </Button>
                </section>
            );
        }

        return this.props.children;
    }
}

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";

import {
    fetchCurrentUser,
    login as apiLogin,
    logout as apiLogout,
    register as apiRegister,
    updateCurrentUser,
    type RegisterData,
} from "../api/auth";

import { getToken } from "../api/token";

import type {
    User,
} from "../types/user";

type AuthContextValue = {
    /** null — гость (не вошёл) либо ещё идёт проверка сохранённого
     * токена при загрузке страницы. Смотри isLoading, чтобы отличить
     * одно от другого — используется в ProtectedLayout. */
    user: User | null;

    /** Настоящий React-сеттер состояния — намеренно доступен наружу,
     * чтобы useCurrentUser() ниже мог обновлять того же самого
     * пользователя и это корректно перерисовывало вообще все
     * компоненты-подписчики контекста, а не только тот, что вызвал
     * изменение (если бы состояние жило в локальном useState внутри
     * самого useCurrentUser, разные компоненты просто разъехались бы
     * друг с другом). */
    setUser: Dispatch<SetStateAction<User | null>>;

    isLoading: boolean;

    login: (nickname: string, password: string) => Promise<void>;

    register: (data: RegisterData) => Promise<void>;

    logout: () => void;
};

const AuthContext =
    createContext<AuthContextValue | undefined>(undefined);

export function CurrentUserProvider({
    children,
}: {
    children: ReactNode;
}) {

    const [user, setUser] = useState<User | null>(null);

    // Ленивый инициализатор вместо synchronous setState в эффекте:
    // если токена нет — грузить нечего, isLoading сразу false.
    // Если токен есть — true, пока не придёт ответ fetchCurrentUser.
    const [isLoading, setIsLoading] = useState<boolean>(() =>
        Boolean(getToken())
    );

    // При загрузке приложения — если в localStorage уже есть токен
    // с прошлого раза, пробуем восстановить сессию молча, без
    // повторного ввода логина/пароля. Если токен протух или невалиден,
    // сервер ответит 401 — тогда просто остаёмся в состоянии "гость".
    useEffect(() => {
        const token = getToken();

        if (!token) {
            return;
        }

        fetchCurrentUser()
            .then(setUser)
            .catch(() => {
                apiLogout();
                setUser(null);
            })
            .finally(() => setIsLoading(false));
    }, []);

    async function login(nickname: string, password: string) {
        const loggedInUser = await apiLogin(nickname, password);
        setUser(loggedInUser);
    }

    async function register(data: RegisterData) {
        const registeredUser = await apiRegister(data);
        setUser(registeredUser);
    }

    function logout() {
        apiLogout();
        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                isLoading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );

}

/**
 * Для App-уровня: экранов входа/регистрации и ProtectedLayout,
 * которым нужно уметь отличить "гость" от "ещё грузится" от
 * "вошёл". Внутри защищённого дерева (после ProtectedLayout)
 * используйте useCurrentUser — там пользователь уже гарантированно
 * есть.
 */
export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside CurrentUserProvider"
        );
    }

    return context;
}

type CurrentUserContextValue = {
    currentUser: User;
    setCurrentUser: Dispatch<SetStateAction<User>>;
};

/**
 * Для всего остального приложения — всех контекстов и страниц,
 * которые монтируются только внутри ProtectedLayout и поэтому вправе
 * рассчитывать, что currentUser точно есть (не null). Бросает
 * исключение, если вызвать её вне защищённого дерева, — это баг
 * маршрутизации, а не штатная ситуация "пользователь не вошёл".
 *
 * setCurrentUser сохранил старую сигнатуру (как обычный useState) —
 * все существующие вызовы вроде setCurrentUser({...currentUser, bio})
 * в EditProfile/AccountSettings продолжают работать без изменений.
 * Разница в том, что теперь изменение реально уходит на бэкенд
 * (PUT /users/me) в фоне, а не остаётся только в памяти вкладки.
 */
export function useCurrentUser(): CurrentUserContextValue {
    const { user, isLoading, setUser } = useAuth();

    if (!user) {
        throw new Error(
            isLoading
                ? "useCurrentUser вызван до завершения проверки токена"
                : "useCurrentUser вызван вне защищённого маршрута (ProtectedLayout)"
        );
    }

    function setCurrentUser(value: SetStateAction<User>) {
        setUser((prev) => {
            if (!prev) {
                return prev;
            }

            const next =
                typeof value === "function"
                    ? (value as (previous: User) => User)(prev)
                    : value;

            // Персистим в фоне (не блокируем UI). Если сервер
            // ответит чем-то отличающимся (например, нормализовал
            // строку) — подтягиваем именно его версию поверх
            // оптимистичной.
            updateCurrentUser(next)
                .then(setUser)
                .catch((error: unknown) => {
                    console.error(
                        "Не удалось сохранить изменения профиля:",
                        error
                    );
                });

            return next;
        });
    }

    return { currentUser: user, setCurrentUser };
}

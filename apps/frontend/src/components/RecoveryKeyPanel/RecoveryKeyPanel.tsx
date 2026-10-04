import { useEffect, useRef, useState } from "react";

import Button from "../ui/Button/Button";
import ActionGroup from "../ui/ActionGroup/ActionGroup";

import "../../styles/components/recovery-key-panel.css";

const SITE_NAME = "Street Workout Community";

type RecoveryKeyPanelProps = {
    recoveryKey: string;

    /** Username — попадает в имя и текст скачиваемого файла, чтобы
     * при нескольких аккаунтах было понятно, к какому относится ключ. */
    nickname: string;

    /** Подпись кнопки, которая закрывает экран с ключом. */
    confirmLabel: string;

    onConfirm: () => void;
};

async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);

            return true;
        }
    } catch {
        // Нет доступа к буферу обмена (например, страница открыта не
        // по HTTPS) — пробуем запасной способ ниже.
    }

    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();

    let isCopied: boolean;

    try {
        isCopied = document.execCommand("copy");
    } catch {
        isCopied = false;
    }

    document.body.removeChild(textarea);

    return isCopied;
}

function buildKeyFileText(nickname: string, recoveryKey: string): string {
    const createdAt = new Date().toLocaleDateString("ru-RU");

    return [
        `${SITE_NAME} — ключ восстановления доступа`,
        "",
        `Username: ${nickname}`,
        `Ключ восстановления: ${recoveryKey}`,
        `Создан: ${createdAt}`,
        "",
        "Как этим пользоваться",
        `Если вы забудете пароль, откройте ${window.location.origin}/recover,`,
        "введите username, этот ключ и новый пароль. После восстановления",
        "ключ перестанет действовать — вместо него выдаётся новый,",
        "сохраните и его.",
        "",
        "Важно",
        "— Храните этот файл в надёжном месте: в менеджере паролей или",
        "  распечатанным. Портал не хранит ваш ключ и не сможет показать",
        "  его снова.",
        "— Любой, у кого есть этот ключ, может сменить пароль вашего",
        "  аккаунта. Никому его не передавайте и не публикуйте.",
        "— Если ключ утерян или попал в чужие руки, создайте новый в",
        "  настройках аккаунта (Профиль → Настройки → Безопасность):",
        "  прежний ключ сразу перестанет работать.",
        "",
    ].join("\r\n");
}

function downloadKeyFile(nickname: string, recoveryKey: string) {
    // BOM в начале — чтобы старые версии Блокнота Windows не принимали
    // UTF-8 за ANSI и не портили русский текст.
    const blob = new Blob(
        ["\uFEFF" + buildKeyFileText(nickname, recoveryKey)],
        { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `workout-community-recovery-key-${nickname.replace(/[^\w.-]/g, "_")}.txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Не отзываем ссылку сразу: часть браузеров начинает скачивание
    // уже после выхода из обработчика клика.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Экран "Сохраните ключ восстановления". Ключ показывается один раз —
 * на сервере остаётся только его хеш, поэтому после закрытия экрана
 * посмотреть ключ повторно нельзя, можно лишь создать новый. Чтобы
 * человек не закрыл экран, не сохранив ключ, кнопка подтверждения
 * доступна только после отметки "Я сохранил ключ", а попытка закрыть
 * вкладку до этого вызывает предупреждение браузера.
 */
export default function RecoveryKeyPanel({
    recoveryKey,
    nickname,
    confirmLabel,
    onConfirm,
}: RecoveryKeyPanelProps) {
    const [isSaved, setIsSaved] = useState(false);
    const [copyStatus, setCopyStatus] =
        useState<"idle" | "copied" | "failed">("idle");

    const resetTimerRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        function handleBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault();
        }

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.clearTimeout(resetTimerRef.current);
        };
    }, []);

    async function handleCopy() {
        const isCopied = await copyToClipboard(recoveryKey);

        setCopyStatus(isCopied ? "copied" : "failed");

        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = window.setTimeout(
            () => setCopyStatus("idle"),
            3000
        );
    }

    return (
        <div className="recovery-key-panel">
            <p className="recovery-key-panel__text">
                На портале нет почты и других контактов, поэтому при
                потере пароля войти можно будет только с помощью этого
                ключа. Он показывается <strong>один раз</strong> — сохраните
                его сейчас.
            </p>

            <div className="recovery-key-panel__box">
                <code
                    className="recovery-key-panel__value"
                    aria-label="Ключ восстановления"
                >
                    {recoveryKey}
                </code>
            </div>

            <div className="recovery-key-panel__tools">
                <Button
                    type="button"
                    variant="outline"
                    className="recovery-key-panel__tool"
                    onClick={handleCopy}
                >
                    {copyStatus === "copied" ? "Скопировано ✓" : "Скопировать"}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    className="recovery-key-panel__tool"
                    onClick={() => downloadKeyFile(nickname, recoveryKey)}
                >
                    Скачать .txt
                </Button>
            </div>

            <p
                className="recovery-key-panel__status"
                role="status"
                aria-live="polite"
            >
                {
                    copyStatus === "failed"
                        ? "Не удалось скопировать автоматически — выделите ключ и скопируйте вручную."
                        : ""
                }
            </p>

            <ul className="recovery-key-panel__notes">
                <li>
                    Храните ключ в менеджере паролей или на бумаге в
                    надёжном месте.
                </li>
                <li>
                    Любой, у кого есть ключ, может сменить пароль вашего
                    аккаунта — никому его не передавайте и не публикуйте.
                </li>
                <li>
                    После восстановления доступа этот ключ перестаёт
                    действовать и выдаётся новый.
                </li>
            </ul>

            <label className="recovery-key-panel__confirm">
                <input
                    type="checkbox"
                    checked={isSaved}
                    onChange={(event) => setIsSaved(event.target.checked)}
                />
                <span>Я сохранил(а) ключ в надёжном месте</span>
            </label>

            <ActionGroup>
                <Button
                    type="button"
                    disabled={!isSaved}
                    onClick={onConfirm}
                >
                    {confirmLabel}
                </Button>
            </ActionGroup>
        </div>
    );
}

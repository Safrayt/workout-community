/**
 * Звуковой сигнал и вибрация — когда закончился отдых или время
 * упражнения. Браузеры разрешают звук только после действия человека
 * (нажатия), поэтому unlockSignal() вызывается из обработчиков кнопок
 * «Начать», «Готово» и т.п.: к концу отдыха звук уже разрешён.
 */

type AudioContextConstructor = typeof AudioContext;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (audioContext) {
        return audioContext;
    }

    const Constructor: AudioContextConstructor | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioContextConstructor })
            .webkitAudioContext;

    if (!Constructor) {
        return null;
    }

    try {
        audioContext = new Constructor();
    } catch {
        audioContext = null;
    }

    return audioContext;
}

/** Разрешить звук: вызывать из обработчика нажатия. */
export function unlockSignal(): void {
    const context = getAudioContext();

    if (context && context.state === "suspended") {
        context.resume().catch(() => undefined);
    }
}

function beep(context: AudioContext, startAt: number, frequency: number) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    // Плавное нарастание и затухание, чтобы не щёлкало.
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.4, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.28);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + 0.3);
}

/** Три коротких сигнала и вибрация (где она есть). */
export function playSignal(): void {
    const context = getAudioContext();

    if (context) {
        const start = context.currentTime + 0.02;

        [0, 0.35, 0.7].forEach((offset) =>
            beep(context, start + offset, offset === 0.7 ? 1175 : 880)
        );
    }

    try {
        navigator.vibrate?.([250, 120, 250, 120, 400]);
    } catch {
        // Вибрация недоступна — не страшно.
    }
}

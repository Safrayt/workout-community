import type { Exercise } from "../types/exercise";
import type { NewExercise } from "../types/newExercise";

/**
 * Пункт, с которого может начинаться строка в тексте, вставленном из
 * поста или заметки: маркеры списка ("●", "•", "-", "–", "—", "*") или
 * номер ("1.", "2)"). При разборе такой префикс отбрасывается — иначе
 * в базе оказывались бы пункты вида "● Подходит для начинающих", а
 * шаги техники дублировали бы нумерацию, которую сайт ставит сам.
 */
const LIST_MARKER = /^\s*(?:[●•▪◦·*\-–—]|\d+[.)])\s*/u;

/** Текст из поля "по одному пункту на строку" → список пунктов. */
export function linesToItems(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map((line) => line.replace(LIST_MARKER, "").trim())
        .filter((line) => line !== "");
}

/** Список пунктов → текст для поля "по одному пункту на строку". */
export function itemsToLines(items: string[]): string {
    return items.join("\n");
}

/** Упражнение с сервера → значение формы редактирования. */
export function exerciseToFormValue(exercise: Exercise): NewExercise {
    return {
        name: exercise.name,
        nameEn: exercise.nameEn ?? "",
        movementType: exercise.movementType,
        targetMuscles: exercise.targetMuscles,
        auxiliaryMuscles: exercise.auxiliaryMuscles,
        equipment: exercise.equipment,
        description: exercise.description,
        advantages: exercise.advantages ?? [],
        disadvantages: exercise.disadvantages ?? [],
        technique: exercise.technique,
        features: exercise.features ?? [],
        suitableFor: exercise.suitableFor ?? [],
    };
}

// Пределы совпадают с серверными (app/models_exercise.py): сервер всё
// равно проверит, но человеку лучше увидеть ошибку у нужного поля.
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_ITEM_LENGTH = 500;
const MAX_LIST_ITEMS = 20;

export type ExerciseFormErrors = Partial<
    Record<
        | "name"
        | "nameEn"
        | "movementType"
        | "targetMuscles"
        | "equipment"
        | "description"
        | "advantages"
        | "disadvantages"
        | "technique"
        | "features"
        | "suitableFor",
        string
    >
>;

function checkListLimits(items: string[]): string | undefined {
    if (items.length > MAX_LIST_ITEMS) {
        return `Не больше ${MAX_LIST_ITEMS} пунктов.`;
    }

    if (items.some((item) => item.length > MAX_ITEM_LENGTH)) {
        return `Каждый пункт не длиннее ${MAX_ITEM_LENGTH} символов.`;
    }

    return undefined;
}

/**
 * Проверка перед отправкой — те же обязательные поля, что требует
 * сервер (app/models_exercise.py), чтобы человек увидел ошибку сразу
 * у нужного поля, а не общее сообщение после отправки.
 */
export function validateExerciseForm(value: NewExercise): ExerciseFormErrors {
    const errors: ExerciseFormErrors = {};

    if (value.name.trim() === "") {
        errors.name = "Укажите название упражнения.";
    } else if (value.name.trim().length > MAX_NAME_LENGTH) {
        errors.name = `Название не длиннее ${MAX_NAME_LENGTH} символов.`;
    }

    if (value.nameEn.trim().length > MAX_NAME_LENGTH) {
        errors.nameEn = `Название не длиннее ${MAX_NAME_LENGTH} символов.`;
    }

    if (value.movementType === "") {
        errors.movementType = "Выберите тип движения.";
    }

    if (value.targetMuscles.length === 0) {
        errors.targetMuscles = "Выберите хотя бы одну целевую мышцу.";
    }

    if (value.equipment.length === 0) {
        errors.equipment =
            "Укажите оборудование, например «Без оборудования».";
    } else {
        errors.equipment = checkListLimits(value.equipment);
    }

    if (value.description.trim() === "") {
        errors.description = "Заполните блок «Что это такое?».";
    } else if (value.description.trim().length > MAX_DESCRIPTION_LENGTH) {
        errors.description = `Не длиннее ${MAX_DESCRIPTION_LENGTH} символов.`;
    }

    if (value.technique.length === 0) {
        errors.technique = "Добавьте хотя бы один шаг техники выполнения.";
    } else {
        errors.technique = checkListLimits(value.technique);
    }

    errors.advantages = checkListLimits(value.advantages);
    errors.disadvantages = checkListLimits(value.disadvantages);
    errors.features = checkListLimits(value.features);
    errors.suitableFor = checkListLimits(value.suitableFor);

    // Без ключей со значением undefined: так проверка "есть ли ошибки" —
    // это просто Object.keys(errors).length.
    for (const key of Object.keys(errors) as (keyof ExerciseFormErrors)[]) {
        if (errors[key] === undefined) {
            delete errors[key];
        }
    }

    return errors;
}

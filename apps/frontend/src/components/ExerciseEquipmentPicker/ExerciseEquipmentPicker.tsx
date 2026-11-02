import "../../styles/components/checkbox-grid.css";
import "../../styles/components/exercise-equipment-picker.css";

import type { ExerciseEquipmentKey } from "../../types/exercise";
import type { PlaygroundEquipment } from "../../types/playground";

import { playgroundEquipment } from "../../constants/playgroundEquipment";
import {
    getEquipmentName,
    playgroundEquipmentGroups,
    universalEquipmentKeys,
} from "../../constants/exerciseEquipment";

export type ExerciseEquipmentValue = {
    equipment: ExerciseEquipmentKey[];
    noEquipment: boolean;
};

type ExerciseEquipmentPickerProps = ExerciseEquipmentValue & {
    onChange: (value: ExerciseEquipmentValue) => void;
};

/**
 * Выбор оборудования упражнения: отметка «Без оборудования» и список
 * всего оборудования площадок по группам. Достаточно любого из
 * отмеченных пунктов. Универсальное оборудование (вертикальный столб)
 * вынесено в отдельную группу: оно считается имеющимся на любой
 * площадке.
 */
export default function ExerciseEquipmentPicker({
    equipment,
    noEquipment,
    onChange,
}: ExerciseEquipmentPickerProps) {
    function toggleNoEquipment(checked: boolean) {
        // «Без оборудования» исключает любое оборудование.
        onChange({ equipment: [], noEquipment: checked });
    }

    function toggleItem(key: ExerciseEquipmentKey) {
        onChange({
            equipment: equipment.includes(key)
                ? equipment.filter((item) => item !== key)
                : [...equipment, key],
            noEquipment: false,
        });
    }

    function toggleGroup(items: PlaygroundEquipment[]) {
        const isAllSelected = items.every((item) => equipment.includes(item));

        onChange({
            equipment: isAllSelected
                ? equipment.filter(
                      (item) => !(items as ExerciseEquipmentKey[]).includes(item)
                  )
                : [
                      ...equipment,
                      ...items.filter((item) => !equipment.includes(item)),
                  ],
            noEquipment: false,
        });
    }

    return (
        <div className="exercise-equipment-picker">
            <label className="checkbox-option exercise-equipment-picker__none">
                <input
                    type="checkbox"
                    checked={noEquipment}
                    onChange={(event) => toggleNoEquipment(event.target.checked)}
                />
                Без оборудования
            </label>

            <p className="exercise-equipment-picker__hint">
                Упражнение подойдёт площадке, где есть хотя бы один из
                отмеченных пунктов.
            </p>

            {playgroundEquipmentGroups.map((group) => {
                const isAllSelected = group.items.every((item) =>
                    equipment.includes(item)
                );

                return (
                    <div key={group.category}>
                        <div className="exercise-equipment-picker__group-head">
                            <h4 className="checkbox-group-title">
                                {group.label}
                            </h4>

                            {group.items.length > 1 && (
                                <button
                                    type="button"
                                    className="exercise-equipment-picker__group-toggle"
                                    disabled={noEquipment}
                                    onClick={() => toggleGroup(group.items)}
                                >
                                    {isAllSelected
                                        ? "Снять всю группу"
                                        : "Выбрать всю группу"}
                                </button>
                            )}
                        </div>

                        <div className="checkbox-grid">
                            {group.items.map((key) => (
                                <label key={key} className="checkbox-option">
                                    <input
                                        type="checkbox"
                                        checked={equipment.includes(key)}
                                        disabled={noEquipment}
                                        onChange={() => toggleItem(key)}
                                    />
                                    <img
                                        src={playgroundEquipment[key].icon}
                                        alt=""
                                        className="playground-form__equipment-icon"
                                        width={50}
                                        height={50}
                                    />
                                    {playgroundEquipment[key].name}
                                </label>
                            ))}
                        </div>
                    </div>
                );
            })}

            <div>
                <h4 className="checkbox-group-title">
                    Есть на любой площадке
                </h4>

                <div className="checkbox-grid">
                    {universalEquipmentKeys.map((key) => (
                        <label key={key} className="checkbox-option">
                            <input
                                type="checkbox"
                                checked={equipment.includes(key)}
                                disabled={noEquipment}
                                onChange={() => toggleItem(key)}
                            />
                            {getEquipmentName(key)}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}

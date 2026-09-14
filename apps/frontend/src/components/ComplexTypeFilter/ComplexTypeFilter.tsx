import TagBadge from "../ui/TagBadge/TagBadge";

import "../../styles/components/complex-type-filter.css";

import type { ComplexType } from "../../types/complex";
import { complexTypeFilterOptions } from "../../constants/complexTypes";

type ComplexTypeFilterProps = {
    selectedTypes: ComplexType[];

    onChange: (types: ComplexType[]) => void;
};

/**
 * Фильтр по формату тренировки — тегами, а не выпадающим списком:
 * один комплекс может одновременно быть, например, и "Круги", и
 * "Лесенка" (см. types/complex.ts), поэтому выбор одного варианта
 * из списка сюда не подходит. Несколько выбранных тегов работают по
 * И — показываются только комплексы, у которых есть КАЖДЫЙ из
 * отмеченных тегов (см. фильтрацию в pages/Complexes/Complexes.tsx).
 */
export default function ComplexTypeFilter({
    selectedTypes,
    onChange,
}: ComplexTypeFilterProps) {
    function toggleType(type: ComplexType) {
        onChange(
            selectedTypes.includes(type)
                ? selectedTypes.filter((item) => item !== type)
                : [...selectedTypes, type]
        );
    }

    return (
        <div className="complex-type-filter">
            <span className="complex-type-filter__label">Тип</span>

            <div className="complex-type-filter__tags">
                {
                    complexTypeFilterOptions.map((option) => (
                        <TagBadge
                            key={option.value}
                            label={option.label}
                            active={selectedTypes.includes(option.value)}
                            onClick={() => toggleType(option.value)}
                        />
                    ))
                }
            </div>
        </div>
    );
}

import type {
    PlaygroundSize,
    PlaygroundSurface,
    PlaygroundEquipment,
    PlaygroundAmenities,
} from "../../types/playground";

import type {
    PlaygroundFilterState,
} from "../../types/playgroundFilters";

import { emptyPlaygroundFilters } from "../../types/playgroundFilters";
import { hasActivePlaygroundFilters } from "../../utils/playgroundFilters";

import FormSection from "../ui/FormSection/FormSection";
import Button from "../ui/Button/Button";

import {
    playgroundSizes,
    playgroundSurfaces,
} from "../../constants/playgroundProperties";

import {
    playgroundEquipment,
    equipmentCategoryLabels,
} from "../../constants/playgroundEquipment";

import type {
    PlaygroundEquipmentCategory,
} from "../../constants/playgroundEquipment";

import {
    playgroundAmenityLabels,
} from "../../constants/playgroundAmenities";

import "../../styles/components/playground-filters.css";

type PlaygroundFiltersProps = {
    filters: PlaygroundFilterState;

    onChange: (filters: PlaygroundFilterState) => void;
};

function toggleValue<T>(
    list: T[],
    value: T
) {
    return list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
}

const equipmentCategoryOrder: PlaygroundEquipmentCategory[] = [
    "pullBars",
    "parallelBars",
    "pushBars",
    "climbing",
    "accessories",
];

export default function PlaygroundFilters({
    filters,
    onChange,
}: PlaygroundFiltersProps) {

    function toggleSize(size: PlaygroundSize) {
        onChange({
            ...filters,
            sizes: toggleValue(filters.sizes, size),
        });
    }

    function toggleSurface(surface: PlaygroundSurface) {
        onChange({
            ...filters,
            surfaces: toggleValue(filters.surfaces, surface),
        });
    }

    function toggleEquipment(item: PlaygroundEquipment) {
        onChange({
            ...filters,
            equipment: toggleValue(filters.equipment, item),
        });
    }

    function toggleAmenity(key: keyof PlaygroundAmenities) {
        onChange({
            ...filters,
            amenities: toggleValue(filters.amenities, key),
        });
    }

    return (
        <div className="playground-filters">

            <div className="playground-filters__row">

            <FormSection title="Размер">
                {
                    (Object.keys(playgroundSizes) as PlaygroundSize[]).map(
                        (size) => (
                            <label
                                key={size}
                                className="playground-filters__checkbox"
                            >
                                <input
                                    type="checkbox"
                                    checked={filters.sizes.includes(size)}
                                    onChange={() => toggleSize(size)}
                                />
                                {playgroundSizes[size]}
                            </label>
                        )
                    )
                }
            </FormSection>

            <FormSection title="Покрытие">
                {
                    (Object.keys(playgroundSurfaces) as PlaygroundSurface[]).map(
                        (surface) => (
                            <label
                                key={surface}
                                className="playground-filters__checkbox"
                            >
                                <input
                                    type="checkbox"
                                    checked={filters.surfaces.includes(surface)}
                                    onChange={() => toggleSurface(surface)}
                                />
                                {playgroundSurfaces[surface]}
                            </label>
                        )
                    )
                }
            </FormSection>

            <FormSection title="Удобства">
                {
                    (
                        Object.entries(playgroundAmenityLabels) as [
                            keyof PlaygroundAmenities,
                            string,
                        ][]
                    ).map(
                        ([key, label]) => (
                            <label
                                key={key}
                                className="playground-filters__checkbox"
                            >
                                <input
                                    type="checkbox"
                                    checked={filters.amenities.includes(key)}
                                    onChange={() => toggleAmenity(key)}
                                />
                                {label}
                            </label>
                        )
                    )
                }
            </FormSection>

            </div>

            <FormSection title="Оборудование">
                {
                    equipmentCategoryOrder.map(
                        (category) => (
                            <div
                                key={category}
                                className="playground-filters__group"
                            >
                                <p className="playground-filters__group-title">
                                    {equipmentCategoryLabels[category]}
                                </p>

                                <div className="playground-filters__group-items">
                                    {
                                        (
                                            Object.entries(playgroundEquipment) as [
                                                PlaygroundEquipment,
                                                typeof playgroundEquipment[PlaygroundEquipment],
                                            ][]
                                        )
                                            .filter(
                                                ([, info]) => info.category === category
                                            )
                                            .map(
                                                ([key, info]) => (
                                                    <label
                                                        key={key}
                                                        className="playground-filters__checkbox"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={filters.equipment.includes(key)}
                                                            onChange={() => toggleEquipment(key)}
                                                        />
                                                        {info.icon} {info.name}
                                                    </label>
                                                )
                                            )
                                    }
                                </div>
                            </div>
                        )
                    )
                }
            </FormSection>

            {
                hasActivePlaygroundFilters(filters) && (
                    <div className="playground-filters__reset">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onChange(emptyPlaygroundFilters)}
                        >
                            Сбросить фильтры
                        </Button>
                    </div>
                )
            }

        </div>
    );
}
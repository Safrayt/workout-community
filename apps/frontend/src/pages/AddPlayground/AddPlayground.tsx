import "../../styles/components/checkbox-grid.css";

import Section from "../../components/ui/Section/Section";
import FormSection from "../../components/ui/FormSection/FormSection";
import Input from "../../components/ui/Input/Input";
import Textarea from "../../components/ui/Textarea/Textarea";
import Select from "../../components/ui/Select/Select";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";
import PlaygroundPhotoUpload from "../../components/PlaygroundPhotoUpload/PlaygroundPhotoUpload";

import { usePlaygrounds } from "../../context/PlaygroundContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import PlaygroundsMap from "../../components/Map/PlaygroundsMap";
import { getPlaygroundMarkers } from "../../utils/maps";
import {
    reverseGeocode,
} from "../../services/geocoding";

import type {
    ValidationError,
} from "../../validation";
import {
    validatePlayground,
} from "../../validation/playground";
import {
    getFieldError,
} from "../../utils/validation.ts";

import {
    playgroundSizes,
    playgroundSurfaces,
} from "../../constants/playgroundProperties";
import {
    playgroundAmenityLabels,
} from "../../constants/playgroundAmenities";
import {
    playgroundEquipment,
    equipmentCategoryLabels,
    type PlaygroundEquipmentCategory,
} from "../../constants/playgroundEquipment";
import {
    MAX_PLAYGROUND_PHOTOS,
} from "../../constants/playgroundPhotos";

import type {
    NewPlayground,
} from "../../types/newPlayground";
import type {
    PlaygroundEquipment,
} from "../../types/playground";

const sizeOptions = Object.entries(playgroundSizes).map(
    ([value, label]) => ({ value, label })
);

const surfaceOptions = Object.entries(playgroundSurfaces).map(
    ([value, label]) => ({ value, label })
);

const equipmentByCategory = Object.entries(playgroundEquipment).reduce(
    (groups, [key, info]) => {
        const list = groups.get(info.category) ?? [];
        list.push(key as PlaygroundEquipment);
        groups.set(info.category, list);
        return groups;
    },
    new Map<PlaygroundEquipmentCategory, PlaygroundEquipment[]>()
);

export default function AddPlayground() {
    const [errors, setErrors] =
        useState<ValidationError[]>([]);

    const [
        playground,
        setPlayground,
    ] = useState<NewPlayground>({
        name: "",
        locality: "",
        address: "",
        coordinates: null,
        size: "",
        surface: "",
        amenities: {
            lighting: false,
            covered: false,
            changingRoom: false,
            toilet: false,
            drinkingWater: false,
            shower: false,
            parking: false,
            bicycleParking: false,
        },
        equipment: [],
        photos: [],
        openingHours: "",
        description: "",
    });

    const {
        playgrounds,
        addPlayground,
    } = usePlaygrounds();

    const navigate =
        useNavigate();

    function updateField<
            K extends keyof NewPlayground
        >(
            field: K,
            value: NewPlayground[K]
        ) {
            setPlayground(
                (current) => ({
                    ...current,
                    [field]: value,
                })
            );

            setErrors(
                (current) =>
                    current.filter(
                        (error) => error.field !== field
                    )
            );
        }

    function toggleAmenity(
        key: keyof NewPlayground["amenities"]
    ) {
        setPlayground(
            (current) => ({
                ...current,
                amenities: {
                    ...current.amenities,
                    [key]: !current.amenities[key],
                },
            })
        );
    }

    function toggleEquipment(
        key: PlaygroundEquipment
    ) {
        setPlayground(
            (current) => ({
                ...current,
                equipment: current.equipment.includes(key)
                    ? current.equipment.filter(
                        (item) => item !== key
                    )
                    : [...current.equipment, key],
            })
        );
    }

    function handleSubmit() {
        const result =
            validatePlayground(playground);

        if (!result.valid) {
            setErrors(result.errors);
            return;
        }

        setErrors([]);

        const createdPlayground =
            addPlayground(playground);

        navigate(
            `/playgrounds/${createdPlayground.id}`
        );
    }

    return (
        <Section title="Добавление площадки">
            <FormSection title="Местоположение">
                <PlaygroundsMap
                    markers={getPlaygroundMarkers(playgrounds)}
                    selectedLatitude={
                        playground.coordinates?.latitude
                    }
                    selectedLongitude={
                        playground.coordinates?.longitude
                    }
                    onMapClick={async (
                        latitude,
                        longitude
                    ) => {

                        updateField(
                            "coordinates",
                            { latitude, longitude }
                        );

                        try {

                            const result =
                                await reverseGeocode(
                                    latitude,
                                    longitude
                                );

                            updateField(
                                "locality",
                                result.locality
                            );

                            updateField(
                                "address",
                                result.address
                            );

                        } catch (error) {

                            console.error(
                                error
                            );

                        }
                    }}
                />

                {
                    getFieldError(errors, "coordinates") && (
                        <small className="input__error">
                            {getFieldError(errors, "coordinates")}
                        </small>
                    )
                }

                <Input
                    id="locality"
                    label="Населённый пункт"
                    placeholder="Определится по метке на карте"
                    value={playground.locality}
                    readOnly
                    disabled
                />
                <Input
                    id="address"
                    label="Адрес"
                    placeholder="Определится по метке на карте"
                    value={playground.address}
                    readOnly
                    disabled
                />
            </FormSection>

            <FormSection title="Основная информация">
                <Input
                    id="name"
                    label="Название"
                    placeholder="Например, Площадка у стадиона"
                    value={playground.name}
                    error={getFieldError(errors, "name")}
                    onChange={(event) =>
                        updateField(
                            "name",
                            event.target.value
                        )
                    }
                />

                <Select
                    id="size"
                    label="Размер"
                    options={sizeOptions}
                    value={playground.size}
                    error={getFieldError(errors, "size")}
                    onChange={(event) =>
                        updateField(
                            "size",
                            event.target.value as NewPlayground["size"]
                        )
                    }
                />

                <Select
                    id="surface"
                    label="Покрытие"
                    options={surfaceOptions}
                    value={playground.surface}
                    error={getFieldError(errors, "surface")}
                    onChange={(event) =>
                        updateField(
                            "surface",
                            event.target.value as NewPlayground["surface"]
                        )
                    }
                />

                <Input
                    id="openingHours"
                    label="Время работы"
                    placeholder="Например, Круглосуточно"
                    value={playground.openingHours}
                    onChange={(event) =>
                        updateField(
                            "openingHours",
                            event.target.value
                        )
                    }
                />

                <Textarea
                    id="description"
                    label="Описание"
                    placeholder="Кратко опишите площадку, как её найти и что на ней есть"
                    value={playground.description}
                    error={getFieldError(errors, "description")}
                    onChange={(event) =>
                        updateField(
                            "description",
                            event.target.value
                        )
                    }
                />
            </FormSection>

            <FormSection title="Фотографии">
                <PlaygroundPhotoUpload
                    photos={playground.photos}
                    maxPhotos={MAX_PLAYGROUND_PHOTOS}
                    error={getFieldError(errors, "photos")}
                    onChange={(photos) =>
                        updateField("photos", photos)
                    }
                />
            </FormSection>

            <FormSection title="Удобства">
                <div className="checkbox-grid">
                    {
                        (
                            Object.entries(playgroundAmenityLabels) as [
                                keyof NewPlayground["amenities"],
                                string,
                            ][]
                        ).map(([key, label]) => (
                            <label
                                key={key}
                                className="checkbox-option"
                            >
                                <input
                                    type="checkbox"
                                    checked={playground.amenities[key]}
                                    onChange={() => toggleAmenity(key)}
                                />
                                {label}
                            </label>
                        ))
                    }
                </div>
            </FormSection>

            <FormSection title="Оборудование">
                {
                    Array.from(equipmentByCategory.entries()).map(
                        ([category, items]) => (
                            <div key={category}>
                                <h4 className="checkbox-group-title">
                                    {equipmentCategoryLabels[category]}
                                </h4>

                                <div className="checkbox-grid">
                                    {
                                        items.map((key) => {
                                            const info = playgroundEquipment[key];

                                            return (
                                                <label
                                                    key={key}
                                                    className="checkbox-option"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={playground.equipment.includes(key)}
                                                        onChange={() => toggleEquipment(key)}
                                                    />
                                                    {info.icon} {info.name}
                                                </label>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        )
                    )
                }
            </FormSection>

            <ActionGroup>
                <Button
                    onClick={handleSubmit}
                >
                    Добавить площадку
                </Button>
            </ActionGroup>
        </Section>
    );
}
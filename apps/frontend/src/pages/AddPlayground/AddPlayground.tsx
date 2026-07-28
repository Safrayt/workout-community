import Section from "../../components/ui/Section/Section";
import FormSection from "../../components/ui/FormSection/FormSection";
import Input from "../../components/ui/Input/Input";
import Textarea from "../../components/ui/Textarea/Textarea";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";

import { usePlaygrounds } from "../../context/PlaygroundContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import PlaygroundsMap from "../../components/Map/PlaygroundsMap";
import { getPlaygroundMarkers } from "../../utils/maps";
import {
    reverseGeocode,
} from "../../services/geocoding";

import type {
    NewPlayground,
} from "../../types/newPlayground";

export default function AddPlayground() {
    const [
        playground,
        setPlayground,
    ] = useState<NewPlayground>({
        name: "",
        locality: "",
        address: "",
        description: "",
    });

    const [
        selectedCoordinates,
        setSelectedCoordinates,
    ] = useState<{
        latitude?: number;
        longitude?: number;
    }>({});

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
        }
        function handleSubmit() {
            const createdPlayground =
                addPlayground(
                    playground
                );

            navigate(
                `/playgrounds/${createdPlayground.id}`
            );
        }

    return (
        <Section title="Добавление площадки">
            <FormSection title="Основная информация">
                <PlaygroundsMap
                    markers={getPlaygroundMarkers(playgrounds)}
                    selectedLatitude={
                        selectedCoordinates.latitude
                    }
                    selectedLongitude={
                        selectedCoordinates.longitude
                    }
                    onMapClick={async (
                        latitude,
                        longitude
                    ) => {

                        setSelectedCoordinates({
                            latitude,
                            longitude,
                        });

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
                <Input
                    id="name"
                    label="Название"
                    placeholder="Например, Площадка у стадиона"
                    value={playground.name}
                    onChange={(event) =>
                        updateField(
                            "name",
                            event.target.value
                        )
                    }
                />
                <Input
                    id="locality"
                    label="Населённый пункт"
                    placeholder="Например, Минск"
                    value={playground.locality}
                    onChange={(event) =>
                        updateField(
                            "locality",
                            event.target.value
                        )
                    }
                />
                <Input
                    id="address"
                    label="Адрес"
                    placeholder="Например, ул. Ленина, 15"
                    value={playground.address}
                    onChange={(event) =>
                        updateField(
                            "address",
                            event.target.value
                        )
                    }
                />

                <Textarea
                    id="description"
                    label="Описание"
                    placeholder="Кратко опишите площадку, как её найти и что на ней есть"
                    value={playground.description}
                    onChange={(event) =>
                        updateField(
                            "description",
                            event.target.value
                        )
                    }
                />
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
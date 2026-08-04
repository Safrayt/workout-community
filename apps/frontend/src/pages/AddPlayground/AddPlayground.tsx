import Section from "../../components/ui/Section/Section";
import PlaygroundForm from "../../components/PlaygroundForm/PlaygroundForm";

import { usePlaygrounds } from "../../context/PlaygroundContext";
import { useNavigate } from "react-router-dom";

import type {
    NewPlayground,
} from "../../types/newPlayground";

const emptyPlayground: NewPlayground = {
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
};

export default function AddPlayground() {
    const {
        addPlayground,
    } = usePlaygrounds();

    const navigate =
        useNavigate();

    function handleSubmit(
        playground: NewPlayground
    ) {
        const createdPlayground =
            addPlayground(playground);

        navigate(
            `/playgrounds/${createdPlayground.id}`
        );
    }

    return (
        <Section title="Добавление площадки">
            <PlaygroundForm
                initialValue={emptyPlayground}
                submitLabel="Добавить площадку"
                onSubmit={handleSubmit}
            />
        </Section>
    );
}
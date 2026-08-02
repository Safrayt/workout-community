import { useNavigate } from "react-router-dom";

import WorkoutEntryForm from "../../components/WorkoutEntryForm/WorkoutEntryForm";

import type {
    NewWorkoutEntry,
} from "../../types/newWorkoutEntry";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

const emptyEntry: NewWorkoutEntry = {
    date: "",
    timeOfDay: "",
    playgroundId: "",
    title: "",
    description: "",
    tags: [],
};

export default function AddWorkoutEntry() {
    const {
        addEntry,
    } = useWorkoutDiary();

    const navigate =
        useNavigate();

    function handleSubmit(
        entry: NewWorkoutEntry
    ) {
        addEntry(entry);

        navigate("/diary");
    }

    return (
        <WorkoutEntryForm
            title="Новая запись"
            initialValue={emptyEntry}
            submitLabel="Сохранить запись"
            onSubmit={handleSubmit}
        />
    );
}
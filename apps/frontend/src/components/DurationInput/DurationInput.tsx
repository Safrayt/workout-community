import { useState } from "react";

import Input from "../ui/Input/Input";

import "../../styles/components/duration-input.css";

import { hmsToSeconds, secondsToHms } from "../../utils/duration";

type DurationInputProps = {

    idPrefix: string;

    label: string;

    valueSeconds?: number;

    onChange: (seconds: number | undefined) => void;

};

export default function DurationInput({
    idPrefix,
    label,
    valueSeconds,
    onChange,
}: DurationInputProps) {
    const initial = valueSeconds !== undefined ? secondsToHms(valueSeconds) : undefined;

    const [hours, setHours] = useState(initial ? String(initial.hours) : "");
    const [minutes, setMinutes] = useState(initial ? String(initial.minutes) : "");
    const [seconds, setSeconds] = useState(initial ? String(initial.seconds) : "");

    function emit(nextHours: string, nextMinutes: string, nextSeconds: string) {
        if (nextHours === "" && nextMinutes === "" && nextSeconds === "") {
            onChange(undefined);
            return;
        }

        onChange(
            hmsToSeconds(
                nextHours === "" ? 0 : Number(nextHours),
                nextMinutes === "" ? 0 : Number(nextMinutes),
                nextSeconds === "" ? 0 : Number(nextSeconds)
            )
        );
    }

    return (
        <div className="duration-input">
            <p className="duration-input__label">{label}</p>

            <div className="duration-input__fields">
                <Input
                    id={`${idPrefix}-hours`}
                    label="Часы"
                    type="number"
                    min={0}
                    value={hours}
                    onChange={(event) => {
                        setHours(event.target.value);
                        emit(event.target.value, minutes, seconds);
                    }}
                />

                <Input
                    id={`${idPrefix}-minutes`}
                    label="Минуты"
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(event) => {
                        setMinutes(event.target.value);
                        emit(hours, event.target.value, seconds);
                    }}
                />

                <Input
                    id={`${idPrefix}-seconds`}
                    label="Секунды"
                    type="number"
                    min={0}
                    max={59}
                    value={seconds}
                    onChange={(event) => {
                        setSeconds(event.target.value);
                        emit(hours, minutes, event.target.value);
                    }}
                />
            </div>
        </div>
    );
}

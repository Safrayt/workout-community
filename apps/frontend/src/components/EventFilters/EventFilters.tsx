import type {
    EventDateRangeFilter,
    EventFilterState,
    EventStatusFilter,
} from "../../types/eventFilters";

import { defaultEventFilters } from "../../types/eventFilters";
import { hasActiveEventFilters } from "../../utils/eventFilters";

import FormSection from "../ui/FormSection/FormSection";
import Button from "../ui/Button/Button";

import "../../styles/components/event-filters.css";


type EventFiltersProps = {

    filters: EventFilterState;

    onChange: (filters: EventFilterState) => void;

};

const dateRangeOptions: {
    value: EventDateRangeFilter;
    label: string;
}[] = [
    { value: "today", label: "Сегодня" },
    { value: "tomorrow", label: "Завтра" },
    { value: "week", label: "Эта неделя" },
    { value: "month", label: "Этот месяц" },
    { value: "all", label: "Все даты" },
];

const statusOptions: {
    value: EventStatusFilter;
    label: string;
}[] = [
    { value: "upcoming", label: "Предстоящие" },
    { value: "completed", label: "Завершённые" },
];

export default function EventFilters({
    filters,
    onChange,
}: EventFiltersProps) {

    return (
        <div className="event-filters">

            <div className="event-filters__row">

                <FormSection title="Дата">
                    {
                        dateRangeOptions.map(
                            (option) => (
                                <label
                                    key={option.value}
                                    className="event-filters__radio"
                                >
                                    <input
                                        type="radio"
                                        name="event-date-range"
                                        checked={filters.dateRange === option.value}
                                        onChange={() =>
                                            onChange({
                                                ...filters,
                                                dateRange: option.value,
                                            })
                                        }
                                    />
                                    {option.label}
                                </label>
                            )
                        )
                    }
                </FormSection>

                <FormSection title="Статус">
                    {
                        statusOptions.map(
                            (option) => (
                                <label
                                    key={option.value}
                                    className="event-filters__radio"
                                >
                                    <input
                                        type="radio"
                                        name="event-status"
                                        checked={filters.status === option.value}
                                        onChange={() =>
                                            onChange({
                                                ...filters,
                                                status: option.value,
                                            })
                                        }
                                    />
                                    {option.label}
                                </label>
                            )
                        )
                    }
                </FormSection>

            </div>

            {
                hasActiveEventFilters(filters) && (
                    <div className="event-filters__reset">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onChange(defaultEventFilters)}
                        >
                            Сбросить фильтры
                        </Button>
                    </div>
                )
            }

        </div>
    );
}

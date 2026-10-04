import "../../styles/components/muscle-map-legend.css";

export type MuscleMapLegendItem = "target" | "auxiliary" | "selected";

const legendLabels: Record<MuscleMapLegendItem, string> = {
    target: "Целевые мышцы",
    auxiliary: "Вспомогательные мышцы",
    selected: "Выбрано в фильтре",
};

type MuscleMapLegendProps = {
    items: MuscleMapLegendItem[];
};

/** Подпись цветов на карте мышц. */
export default function MuscleMapLegend({ items }: MuscleMapLegendProps) {
    if (items.length === 0) {
        return null;
    }

    return (
        <ul className="muscle-map-legend">
            {
                items.map((item) => (
                    <li key={item} className="muscle-map-legend__item">
                        <span
                            className={`muscle-map-legend__swatch muscle-map-legend__swatch--${item}`}
                            aria-hidden="true"
                        />

                        {legendLabels[item]}
                    </li>
                ))
            }
        </ul>
    );
}

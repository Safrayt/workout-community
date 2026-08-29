import "../../styles/components/complex-star-conditions.css";

import type { Complex } from "../../types/complex";

import { formatStarCondition } from "../../utils/complexResult";

type ComplexStarConditionsListProps = {
    complexDef: Complex;
};

export default function ComplexStarConditionsList({
    complexDef,
}: ComplexStarConditionsListProps) {
    const starTwo = complexDef.starConditions.find((c) => c.stars === 2);
    const starThree = complexDef.starConditions.find((c) => c.stars === 3);

    return (
        <ul className="complex-star-conditions">
            <li className="complex-star-conditions__item">
                <span className="complex-star-conditions__stars">★</span>
                Выполнить комплекс
            </li>

            {
                starTwo && (
                    <li className="complex-star-conditions__item">
                        <span className="complex-star-conditions__stars">★★</span>
                        {formatStarCondition(starTwo)}
                    </li>
                )
            }

            {
                starThree && (
                    <li className="complex-star-conditions__item">
                        <span className="complex-star-conditions__stars">★★★</span>
                        {formatStarCondition(starThree)}
                    </li>
                )
            }
        </ul>
    );
}

import "../../styles/components/complex-movement-variants.css";

import type { ComplexMovement } from "../../types/complex";

type ComplexMovementVariantsProps = {

    movements: ComplexMovement[];

    /** Выбранный вариант для каждого движения: {"Тяга": "Подтягивания"} */
    selected: Record<string, string>;

    onChange: (movementName: string, variantName: string) => void;

};

export default function ComplexMovementVariants({
    movements,
    selected,
    onChange,
}: ComplexMovementVariantsProps) {
    return (
        <div className="complex-movement-variants">
            {
                movements.map((movement) => (
                    <div key={movement.name} className="complex-movement-variants__group">
                        <p className="complex-movement-variants__name">{movement.name}</p>

                        <div className="complex-movement-variants__options">
                            {
                                movement.variants.map((variant) => {
                                    const isSelected =
                                        selected[movement.name] === variant.name;

                                    return (
                                        <button
                                            key={variant.name}
                                            type="button"
                                            className={
                                                isSelected
                                                    ? "complex-movement-variants__option complex-movement-variants__option--selected"
                                                    : "complex-movement-variants__option"
                                            }
                                            onClick={() => onChange(movement.name, variant.name)}
                                        >
                                            {variant.name}
                                        </button>
                                    );
                                })
                            }
                        </div>
                    </div>
                ))
            }
        </div>
    );
}

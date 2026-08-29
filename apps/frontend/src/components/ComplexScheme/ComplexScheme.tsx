import "../../styles/components/complex-scheme.css";

import type { Complex } from "../../types/complex";

type ComplexSchemeProps = {
    complexDef: Complex;
};

export default function ComplexScheme({ complexDef }: ComplexSchemeProps) {
    return (
        <div className="complex-scheme">
            {
                complexDef.schemeSteps && complexDef.schemeSteps.length > 0 ? (
                    <p className="complex-scheme__steps">
                        {
                            complexDef.schemeSteps.map((step, index) => (
                                <span key={index}>
                                    <span className="complex-scheme__step">{step}</span>
                                    {
                                        index < complexDef.schemeSteps!.length - 1 && (
                                            <span className="complex-scheme__arrow"> → </span>
                                        )
                                    }
                                </span>
                            ))
                        }
                    </p>
                ) : (
                    <p className="complex-scheme__display">{complexDef.schemeDisplay}</p>
                )
            }

            {
                complexDef.totalReps !== undefined && (
                    <p className="complex-scheme__total">
                        Всего: {complexDef.totalReps} повторений
                    </p>
                )
            }
        </div>
    );
}

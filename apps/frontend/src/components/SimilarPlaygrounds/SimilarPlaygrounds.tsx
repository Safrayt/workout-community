import InfoSection from "../ui/InfoSection/InfoSection";
import ComingSoonPanel from "../ui/ComingSoonPanel/ComingSoonPanel";

export default function SimilarPlaygrounds() {
    return (
        <InfoSection title="Похожие площадки">
            <ComingSoonPanel
                description="Скоро здесь появятся площадки поблизости с похожим оборудованием."
            />
        </InfoSection>
    );
}

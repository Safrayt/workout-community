import InfoSection from "../ui/InfoSection/InfoSection";
import ComingSoonPanel from "../ui/ComingSoonPanel/ComingSoonPanel";

export default function PlaygroundReviews() {
    return (
        <InfoSection title="Отзывы">
            <ComingSoonPanel
                description="Скоро тут можно будет оставить отзыв о площадке и почитать, что о ней говорят другие."
            />
        </InfoSection>
    );
}

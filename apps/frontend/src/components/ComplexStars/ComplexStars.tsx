import "../../styles/components/complex-stars.css";

type ComplexStarsProps = {

    /** Количество заполненных звёзд, от 0 до 3. */
    stars: number;

    /** Компактный размер — для карточек каталога. */
    size?: "sm" | "md";

};

const MAX_STARS = 3;

export default function ComplexStars({ stars, size = "md" }: ComplexStarsProps) {
    return (
        <span
            className={`complex-stars complex-stars--${size}`}
            role="img"
            aria-label={`${stars} из ${MAX_STARS} звёзд`}
        >
            {
                Array.from({ length: MAX_STARS }, (_, index) => (
                    <span
                        key={index}
                        className={
                            index < stars
                                ? "complex-stars__star complex-stars__star--filled"
                                : "complex-stars__star"
                        }
                        aria-hidden="true"
                    >
                        ★
                    </span>
                ))
            }
        </span>
    );
}

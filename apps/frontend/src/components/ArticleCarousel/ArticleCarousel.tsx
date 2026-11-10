import { useRef, useState, type KeyboardEvent } from "react";

import "../../styles/components/article-carousel.css";

import type { CarouselImage } from "../../utils/articleCarousel";

type ArticleCarouselProps = {
    images: CarouselImage[];
};

/**
 * Карусель картинок в тексте статьи. Слайды — обычная горизонтальная
 * прокрутка со "защёлкиванием" (scroll-snap), поэтому на телефоне
 * листается пальцем, а на компьютере — стрелками по бокам, точками под
 * картинкой или клавишами ← / → (когда карусель в фокусе).
 *
 * Если картинка одна, стрелки и точки не нужны — показывается просто
 * картинка.
 */
export default function ArticleCarousel({ images }: ArticleCarouselProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const total = images.length;

    function scrollToSlide(index: number) {
        const track = trackRef.current;

        if (!track) {
            return;
        }

        const target = Math.min(Math.max(index, 0), total - 1);
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        track.scrollTo({
            left: target * track.clientWidth,
            behavior: reduceMotion ? "auto" : "smooth",
        });
    }

    // Текущий слайд определяем по положению прокрутки: так точки
    // совпадают и с кнопками, и со свайпом пальцем.
    function handleScroll() {
        const track = trackRef.current;

        if (!track || track.clientWidth === 0) {
            return;
        }

        setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollToSlide(activeIndex + 1);
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollToSlide(activeIndex - 1);
        }
    }

    return (
        <section
            className="article-carousel"
            aria-roledescription="карусель"
            aria-label="Картинки к статье"
        >
            <div className="article-carousel__viewport">
                <div
                    ref={trackRef}
                    className="article-carousel__track"
                    tabIndex={total > 1 ? 0 : undefined}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                >
                    {images.map((image, index) => (
                        <div
                            key={`${image.src}-${index}`}
                            className="article-carousel__slide"
                            role="group"
                            aria-roledescription="слайд"
                            aria-label={`${index + 1} из ${total}`}
                        >
                            <img
                                className="article-carousel__image"
                                src={image.src}
                                alt={image.alt}
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>

                {total > 1 && (
                    <>
                        <button
                            type="button"
                            className="article-carousel__nav article-carousel__nav--prev"
                            aria-label="Предыдущая картинка"
                            disabled={activeIndex === 0}
                            onClick={() => scrollToSlide(activeIndex - 1)}
                        >
                            ←
                        </button>

                        <button
                            type="button"
                            className="article-carousel__nav article-carousel__nav--next"
                            aria-label="Следующая картинка"
                            disabled={activeIndex === total - 1}
                            onClick={() => scrollToSlide(activeIndex + 1)}
                        >
                            →
                        </button>

                        <span className="article-carousel__counter">
                            {activeIndex + 1} / {total}
                        </span>
                    </>
                )}
            </div>

            {total > 1 && (
                <div className="article-carousel__dots">
                    {images.map((image, index) => (
                        <button
                            key={`${image.src}-${index}`}
                            type="button"
                            className={
                                "article-carousel__dot" +
                                (index === activeIndex
                                    ? " article-carousel__dot--active"
                                    : "")
                            }
                            aria-label={`Картинка ${index + 1}`}
                            aria-current={index === activeIndex}
                            onClick={() => scrollToSlide(index)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

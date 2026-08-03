import Button from "../Button/Button";

import "../../../styles/components/pagination.css";

type PaginationProps = {
    page: number;

    totalPages: number;

    onPageChange: (page: number) => void;
};

export default function Pagination({
    page,
    totalPages,
    onPageChange,
}: PaginationProps) {
    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="pagination">
            <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() =>
                    onPageChange(page - 1)
                }
            >
                Назад
            </Button>

            <span className="pagination__status">
                {`Страница ${page} из ${totalPages}`}
            </span>

            <Button
                type="button"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() =>
                    onPageChange(page + 1)
                }
            >
                Вперёд
            </Button>
        </div>
    );
}
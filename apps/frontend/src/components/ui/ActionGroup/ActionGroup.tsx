import "../../../styles/components/ActionGroup.css";

type ActionGroupProps = {
    children: React.ReactNode;

    /** По умолчанию кнопки идут столбиком; "row" — в строку (с
     *  переносом на узких экранах). */
    direction?: "column" | "row";
};

export default function ActionGroup({
    children,
    direction = "column",
}: ActionGroupProps) {
    return (
        <div
            className={
                direction === "row"
                    ? "action-group action-group--row"
                    : "action-group"
            }
        >
            {children}
        </div>
    );
}
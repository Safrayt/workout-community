import "../../../styles/components/ActionGroup.css";

type ActionGroupProps = {
    children: React.ReactNode;
};

export default function ActionGroup({
    children,
}: ActionGroupProps) {
    return (
        <div className="action-group">
            {children}
        </div>
    );
}
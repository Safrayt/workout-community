import "../../../styles/components/FormSection.css";

type FormSectionProps = {
    title: string;
    children: React.ReactNode;
};

export default function FormSection({
    title,
    children,
}: FormSectionProps) {
    return (
        <section className="form-section">
            <h3 className="form-section-title">
                {title}
            </h3>

            <div className="form-section-content">
                {children}
            </div>
        </section>
    );
}
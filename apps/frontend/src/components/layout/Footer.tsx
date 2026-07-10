export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <p>© {currentYear} Workout Community</p>

            <small>
                MVP Portal • Open Source Project
            </small>
        </footer>
    );
}
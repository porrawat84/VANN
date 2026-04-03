import BottomNav from "./BottomNav";

export default function AdminLayout({ children, goPage }) {
    return (
        <div className="admin-layout">
            <div className="page-content">
                {children}
            </div>

            <BottomNav goPage={goPage} />
        </div>
    );
}
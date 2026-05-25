import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import api from "../api/client";
import ThemeToggle from "./ThemeToggle";
import { useAuthStore } from "../store/authStore";
import { usePdfStore, type PdfItem } from "../store/pdfStore";

export default function Layout() {
  const navigate = useNavigate();
  const email = useAuthStore((s) => s.email);
  const logout = useAuthStore((s) => s.logout);
  const { pdfs, selectedIds, setPdfs, toggleSelect } = usePdfStore();

  useEffect(() => {
    api
      .get<PdfItem[]>("/pdf/list")
      .then((res) => setPdfs(res.data))
      .catch(() => {});
  }, [setPdfs]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header-row">
            <h1>SelfLearn AI</h1>
            <ThemeToggle />
          </div>
          <p>{email}</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} end>
            Dashboard
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Upload PDFs
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Chat (RAG)
          </NavLink>
          <NavLink to="/quiz" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Quiz
          </NavLink>
          <button type="button" className="nav-link btn-ghost" style={{ marginTop: "0.5rem", width: "100%", textAlign: "left" }} onClick={handleLogout}>
            Log out
          </button>
        </nav>
        <div className="pdf-list-sidebar">
          <h3>Your PDFs ({selectedIds.length} selected)</h3>
          {pdfs.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>No PDFs yet</p>
          ) : (
            pdfs.map((pdf) => (
              <label key={pdf.id} className="pdf-item">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(pdf.id)}
                  onChange={() => toggleSelect(pdf.id)}
                />
                <span title={pdf.filename}>
                  {pdf.filename.length > 28
                    ? `${pdf.filename.slice(0, 25)}...`
                    : pdf.filename}
                </span>
              </label>
            ))
          )}
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

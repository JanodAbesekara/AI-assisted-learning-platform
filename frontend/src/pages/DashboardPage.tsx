import { Link } from "react-router-dom";
import { usePdfStore } from "../store/pdfStore";

export default function DashboardPage() {
  const pdfs = usePdfStore((s) => s.pdfs);
  const selectedIds = usePdfStore((s) => s.selectedIds);

  return (
    <>
      <header className="page-header">
        <h2>Dashboard</h2>
      </header>
      <div className="page-body">
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <p style={{ color: "var(--muted)", marginBottom: "0.5rem" }}>Workspace summary</p>
          <p>
            <strong>{pdfs.length}</strong> PDF(s) uploaded ·{" "}
            <strong>{selectedIds.length}</strong> selected for chat/quiz
          </p>
        </div>
        <div className="dashboard-grid">
          <Link to="/upload" className="dashboard-card">
            <h3>Upload PDFs</h3>
            <p>Add study materials and build your vector index</p>
          </Link>
          <Link to="/chat" className="dashboard-card">
            <h3>RAG Chat</h3>
            <p>Ask questions grounded in your selected documents</p>
          </Link>
          <Link to="/quiz" className="dashboard-card">
            <h3>Generate Quiz</h3>
            <p>MCQs and short answers from your PDFs</p>
          </Link>
        </div>
      </div>
    </>
  );
}

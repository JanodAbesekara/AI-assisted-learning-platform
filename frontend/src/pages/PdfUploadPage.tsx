import { useCallback, useState } from "react";
import api from "../api/client";
import { usePdfStore, type PdfItem } from "../store/pdfStore";

export default function PdfUploadPage() {
  const { pdfs, setPdfs } = usePdfStore();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const refreshList = useCallback(async () => {
    const { data } = await api.get<PdfItem[]>("/pdf/list");
    setPdfs(data);
  }, [setPdfs]);

  const uploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are allowed");
      return;
    }
    setError("");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await api.post("/pdf/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshList();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Upload failed";
      setError(typeof detail === "string" ? detail : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <>
      <header className="page-header">
        <h2>Upload PDFs</h2>
      </header>
      <div className="page-body">
        <div
          className={`upload-zone${dragOver ? " dragover" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <p style={{ marginBottom: "1rem" }}>
            Drag & drop a PDF here, or choose a file
          </p>
          <label className="btn btn-primary">
            {uploading ? "Uploading…" : "Choose PDF"}
            <input
              type="file"
              accept=".pdf,application/pdf"
              hidden
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>
            Max 25MB · Text is extracted, chunked, and indexed in your private FAISS store
          </p>
        </div>
        {error && <p className="error-msg" style={{ marginTop: "1rem" }}>{error}</p>}

        <h3 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Your documents</h3>
        {pdfs.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No PDFs uploaded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pdfs.map((pdf) => (
              <div key={pdf.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{pdf.filename}</strong>
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                    {pdf.chunk_count} chunks · {pdf.indexed ? "Indexed" : "Pending"}
                  </p>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {new Date(pdf.upload_date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

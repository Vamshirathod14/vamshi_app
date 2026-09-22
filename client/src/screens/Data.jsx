import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Download, Upload, FileJson } from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import Layout from "../components/Layout.jsx";
import { Button, Field } from "../components/UI.jsx";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DataPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function exportCsv(type) {
    setBusy(`csv-${type}`);
    try {
      const q = new URLSearchParams({ type });
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const res = await api.raw(`/api/export/csv?${q}`);

      // server may respond JSON on error even though we ask text/csv
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("csv")) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Export failed.");
      }
      const blob = await res.blob();
      downloadBlob(blob, `liv-${type}-${from || "all"}.csv`);
      push("CSV downloaded.", "success");
    } catch (err) {
      push(err.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function exportJson() {
    setBusy("json");
    try {
      const res = await api.raw("/api/export/json");
      const blob = await res.blob();
      downloadBlob(blob, `liv-backup-${new Date().toISOString().slice(0, 10)}.json`);
      push("JSON backup downloaded.", "success");
    } catch (err) {
      push(err.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("import");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await api.post("/api/export/import", { data });
      const c = result.created;
      push(`Imported: ${c.transactions} transactions, ${c.accounts} accounts, ${c.categories} categories.`, "success");
    } catch (err) {
      push(err.message || "Invalid backup file.", "error");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Layout onOpenAdd={() => {}}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> More
          </button>
          <h1 className="screen-title">Data & Backup</h1>
        </div>

        <div className="group-label">CSV Export</div>
        <div className="list-card" style={{ padding: 16 }}>
          <div className="hstack" style={{ gap: 10, marginBottom: 12 }}>
            <Field label="From">
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <Button variant="btn-outline" onClick={() => exportCsv("transactions")} loading={busy === "csv-transactions"}>
              <Download size={16} /> Transactions CSV
            </Button>
            <Button variant="btn-outline" onClick={() => exportCsv("tasks")} loading={busy === "csv-tasks"}>
              <Download size={16} /> Tasks CSV
            </Button>
            <Button variant="btn-outline" onClick={() => exportCsv("notes")} loading={busy === "csv-notes"}>
              <Download size={16} /> Notes CSV
            </Button>
            <Button variant="btn-outline" onClick={() => exportCsv("goals")} loading={busy === "csv-goals"}>
              <Download size={16} /> Goals CSV
            </Button>
          </div>
        </div>

        <div className="group-label">Full Backup</div>
        <div className="list-card" style={{ padding: 16 }}>
          <Button className="btn-block" variant="btn-primary" onClick={exportJson} loading={busy === "json"}>
            <FileJson size={16} /> Download JSON backup
          </Button>
          <div className="small muted" style={{ marginTop: 8 }}>
            Includes accounts, categories, transactions, budgets, goals, tasks, notes, reminders and recurring plans. Keep it safe — it contains everything.
          </div>
          <div style={{ marginTop: 14 }}>
            <Button className="btn-block" variant="btn-outline" onClick={() => fileRef.current?.click()} loading={busy === "import"}>
              <Upload size={16} /> Import JSON backup
            </Button>
            <div className="small muted" style={{ marginTop: 8 }}>Importing appends data. IDs are remapped, and existing records are not overwritten.</div>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onImportFile} />
        </div>
      </div>
    </Layout>
  );
}
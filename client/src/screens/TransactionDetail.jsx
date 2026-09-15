import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Camera, Trash2, Pencil, Download } from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { useData } from "../context/DataContext.jsx";
import Layout from "../components/Layout.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import { Button, Skeleton, Modal } from "../components/UI.jsx";
import { formatINR, formatDateFull, PAYMENT_METHOD_LABELS } from "../utils/format.js";

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh } = useData();
  const { push } = useToast();
  const receiptInputRef = useRef(null);
  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get(`/api/transactions/${id}`);
      setTxn(data.transaction);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [id, push]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.del(`/api/transactions/${id}`);
      push("Transaction deleted.", "success");
      refresh();
      navigate(-1);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  async function uploadReceipt(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptUploading(true);
    try {
      const fd = new FormData();
      fd.append("receipt", file);
      const { receipt } = await api.upload("/api/receipts", fd);
      await api.post(`/api/receipts/${receipt._id}/attach`, { transactionId: id });
      push("Receipt attached!", "success");
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setReceiptUploading(false);
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <Layout onOpenAdd={() => {}}>
        <div className="page"><Skeleton lines={8} /></div>
      </Layout>
    );
  }

  const isIncome = txn?.type === "income";
  const isTransfer = txn?.type === "transfer";
  const icon = isIncome ? "💵" : isTransfer ? "↔️" : txn?.categoryId?.emoji || "💸";

  return (
    <Layout onOpenAdd={() => {}}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate(-1)}>
            <ChevronLeft size={18} /> Back
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn" onClick={() => setEditOpen(true)} aria-label="Edit">
              <Pencil size={17} />
            </button>
            <button className="icon-btn" style={{ color: "var(--red)" }} onClick={() => setDeleteOpen(true)} aria-label="Delete">
              <Trash2 size={17} />
            </button>
          </div>
        </div>

        <div className="tx-hero">
          <div className="tx-emoji">{icon}</div>
          <div className={`tx-amount ${isIncome ? "income" : isTransfer ? "" : "expense"}`}>
            {isIncome ? "+" : isTransfer ? "" : "-"}
            {formatINR(txn.amount)}
          </div>
          <div className="tx-cat">
            {txn.description || (isIncome ? txn.source : isTransfer ? "Transfer" : txn.categoryId?.name)}
          </div>
        </div>

        <div className="list-card" style={{ marginBottom: 16 }}>
          <div className="detail-grid" style={{ padding: "4px 16px" }}>
            <div className="detail-row"><span className="k">Type</span><span className="v" style={{ textTransform: "capitalize" }}>{txn.type}</span></div>
            {!isTransfer && (
              <>
                <div className="detail-row"><span className="k">Category</span><span className="v">{isIncome ? txn.source || "Income" : txn.categoryId?.name || "Uncategorized"}</span></div>
                <div className="detail-row"><span className="k">Account</span><span className="v">{txn.accountId?.name || "—"}</span></div>
              </>
            )}
            {isTransfer && (
              <>
                <div className="detail-row"><span className="k">From</span><span className="v">{txn.fromAccountId?.name || "—"}</span></div>
                <div className="detail-row"><span className="k">To</span><span className="v">{txn.toAccountId?.name || "—"}</span></div>
              </>
            )}
            {!isTransfer && txn.paymentMethod && (
              <div className="detail-row"><span className="k">Payment</span><span className="v">{PAYMENT_METHOD_LABELS[txn.paymentMethod] || txn.paymentMethod}</span></div>
            )}
            <div className="detail-row">
              <span className="k">Date</span>
              <span className="v">{formatDateFull(txn.date)}</span>
            </div>
            {txn.note && <div className="detail-row"><span className="k">Note</span><span className="v" style={{ opacity: 0.9, fontWeight: 450 }}>{txn.note}</span></div>}
          </div>
        </div>

        <div className="list-card">
          <button className="list-row" onClick={() => receiptInputRef.current?.click()} disabled={receiptUploading}>
            <div className="chip accent sm"><Camera size={17} /></div>
            <div style={{ flex: 1 }}>
              <div className="l-title">{txn.receiptId ? "Receipt attached" : "Add receipt photo"}</div>
              <div className="l-sub">{receiptUploading ? "Uploading…" : txn.receiptId ? "Upload a new one" : "Attach a photo or PDF"}</div>
            </div>
            {txn.receiptId && (
              <Download
                size={17}
                style={{ color: "var(--fg-tertiary)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/api/receipts/${txn.receiptId}/download`, "_blank");
                }}
              />
            )}
          </button>
        </div>
        <input ref={receiptInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={uploadReceipt} />

        <Modal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title="Delete this transaction?"
          sub="This will permanently remove the transaction and adjust your account balance."
          actions={
            <>
              <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="btn-danger" onClick={confirmDelete} loading={deleting}>Delete</Button>
            </>
          }
        />
      </div>

      {editOpen && txn && (
        <TransactionForm
          open
          onClose={() => setEditOpen(false)}
          type={txn.type}
          txn={txn}
          onSuccess={() => {
            setEditOpen(false);
            refresh();
            load();
          }}
        />
      )}
    </Layout>
  );
}
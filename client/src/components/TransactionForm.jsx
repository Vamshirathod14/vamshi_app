import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { api } from "../api/client.js";
import { useData } from "../context/DataContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Sheet, Button, Field, MoneyInput, ChipItem } from "./UI.jsx";
import { PAYMENT_METHOD_LABELS, toDateInput, toTimeInput } from "../utils/format.js";
import CatIcon, { PayIcon, AccountTypeIcon } from "./CatIcon.jsx";

const PAYMENT_OPTIONS = ["upi", "cash", "credit-card", "debit-card", "bank-transfer", "other"];

export default function TransactionForm({ open, onClose, type = "expense", txn = null, onSuccess }) {
  const { accounts, expenseCategories, incomeCategories } = useData();
  const { push } = useToast();
  const categories = type === "expense" ? expenseCategories : incomeCategories;
  const isEdit = !!txn;
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toDateInput(new Date()));
  const [time, setTime] = useState(toTimeInput(new Date()));
  const [accountError, setAccountError] = useState("");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [customCategoryEmoji, setCustomCategoryEmoji] = useState("📦");

  useEffect(() => {
    if (!open) return;
    if (txn) {
      setAmount(String(txn.amount));
      setCategoryId(txn.categoryId?._id || txn.categoryId || "");
      setAccountId(txn.accountId?._id || txn.accountId || "");
      setFromAccountId(txn.fromAccountId?._id || txn.fromAccountId || "");
      setToAccountId(txn.toAccountId?._id || txn.toAccountId || "");
      setPaymentMethod(txn.paymentMethod || "upi");
      setSource(txn.source || "");
      setDescription(txn.description || "");
      setNote(txn.note || "");
      setDate(toDateInput(txn.date));
      setTime(txn.date ? toTimeInput(txn.date) : toTimeInput(new Date()));
    } else {
      setAmount("");
      setCategoryId(categories[0]?._id || "");
      setAccountId(accounts.find((a) => a.isDefault)?._id || accounts[0]?._id || "");
      setFromAccountId("");
      setToAccountId("");
      setPaymentMethod("upi");
      setSource("");
      setDescription("");
      setNote("");
      setDate(toDateInput(new Date()));
      setTime(toTimeInput(new Date()));
    }
    setAccountError("");
    setCustomCategoryName("");
    setCustomCategoryEmoji("📦");
  }, [open, txn, categories, accounts]);

  async function save() {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      push("Please enter a valid amount.", "error");
      return;
    }

    if (type === "transfer") {
      if (!fromAccountId || !toAccountId) {
        setAccountError("Please select both accounts.");
        return;
      }
      if (fromAccountId === toAccountId) {
        setAccountError("Cannot transfer to the same account.");
        return;
      }
    }

    setLoading(true);
    try {
      const body = { type, amount: val, date, time };
      if (type === "expense") {
        body.categoryId = categoryId || undefined;
        if (accountId) body.accountId = accountId;
        body.paymentMethod = paymentMethod;
      } else if (type === "income") {
        body.source = source || "Other";
        if (accountId) body.accountId = accountId;
        body.paymentMethod = paymentMethod;
      } else {
        body.fromAccountId = fromAccountId;
        body.toAccountId = toAccountId;
        body.description = description || "";
      }

      if (type !== "transfer") {
        body.description = description;
        body.note = note;
      }

      if (isEdit) {
        await api.patch(`/api/transactions/${txn._id}`, body);
        push("Transaction updated!", "success");
      } else {
        await api.post("/api/transactions", body);
        push(
          type === "expense"
            ? "Expense recorded!"
            : type === "income"
              ? "Income recorded!"
              : "Transfer recorded!",
          "success",
        );
      }
      onSuccess?.();
    } catch (err) {
      push(err.message || "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleCustomCategoryCreate = async () => {
    if (!customCategoryName.trim()) return;
    try {
      await api.post("/api/categories", {
        name: customCategoryName,
        emoji: customCategoryEmoji || "📦",
        type,
        color: "#64748b",
      });
      const catData = await api.get("/api/categories");
      const newCat = catData.categories.find(
        (c) => c.name.toLowerCase() === customCategoryName.toLowerCase() && c.type === type
      );
      if (newCat) setCategoryId(newCat._id);
      setCustomCategoryName("");
      setCustomCategoryEmoji("📦");
      push("Category created!", "success");
    } catch (err) {
      push(err.message, "error");
    }
  };

  const titleMap = { expense: "New Expense", income: "New Income", transfer: "New Transfer" };

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? `Edit ${type}` : titleMap[type]}>
      <div style={{ paddingBottom: 12 }}>
        {type !== "transfer" && (
          <Field label="Amount">
            <MoneyInput value={amount} onChange={setAmount} placeholder="0" id="amount" />
          </Field>
        )}

        {type === "transfer" && (
          <>
            <Field label="Amount">
              <MoneyInput value={amount} onChange={setAmount} placeholder="0" id="amount" />
            </Field>
            <Field label="From account">
              <div className="chip-grid">
                {accounts.map((a) => (
                  <ChipItem
                    key={a._id}
                    active={fromAccountId === a._id}
                    onClick={() => { setFromAccountId(a._id); setAccountError(""); }}
                    icon={<AccountTypeIcon type={a.type} size={20} />}
                    label={a.name}
                  />
                ))}
              </div>
            </Field>
            <Field label="To account">
              <div className="chip-grid">
                {accounts.map((a) => (
                  <ChipItem
                    key={a._id}
                    active={toAccountId === a._id}
                    onClick={() => { setToAccountId(a._id); setAccountError(""); }}
                    icon={<AccountTypeIcon type={a.type} size={20} />}
                    label={a.name}
                  />
                ))}
              </div>
              {accountError && <div style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}>{accountError}</div>}
            </Field>
          </>
        )}

        {type === "expense" && (
          <>
            <Field label="Category">
              <div className="chip-grid">
                {categories.map((c) => (
                  <ChipItem
                    key={c._id}
                    active={categoryId === c._id}
                    onClick={() => setCategoryId(c._id)}
                    icon={<CatIcon category={c} size={20} />}
                    label={c.name}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input
                  className="input"
                  placeholder="Custom category…"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  style={{ flex: 1, padding: "10px 12px", fontSize: 14 }}
                />
                {customCategoryName && (
                  <Button variant="btn-sm" onClick={handleCustomCategoryCreate}>
                    Add
                  </Button>
                )}
              </div>
            </Field>
            {accounts.length > 0 && (
              <Field label="Account">
                <div className="chip-grid">
                  {accounts.map((a) => (
                    <ChipItem
                      key={a._id}
                      active={accountId === a._id}
                      onClick={() => setAccountId(a._id)}
                      icon={<AccountTypeIcon type={a.type} size={20} />}
                      label={a.name}
                    />
                  ))}
                </div>
              </Field>
            )}
            <Field label="Payment method">
              <div className="chip-grid">
                {PAYMENT_OPTIONS.map((m) => (
                  <ChipItem
                    key={m}
                    active={paymentMethod === m}
                    onClick={() => setPaymentMethod(m)}
                    icon={<PayIcon method={m} size={20} />}
                    label={PAYMENT_METHOD_LABELS[m]}
                  />
                ))}
              </div>
            </Field>
          </>
        )}

        {type === "income" && (
          <>
            <Field label="Source">
              <div className="chip-grid">
                {incomeCategories.map((c) => (
                  <ChipItem
                    key={c._id}
                    active={source === c.name}
                    onClick={() => setSource(c.name)}
                    icon={<CatIcon category={c} size={20} />}
                    label={c.name}
                  />
                ))}
              </div>
            </Field>
            {accounts.length > 0 && (
              <Field label="Account">
                <div className="chip-grid">
                  {accounts.map((a) => (
                    <ChipItem
                      key={a._id}
                      active={accountId === a._id}
                      onClick={() => setAccountId(a._id)}
                      icon={<AccountTypeIcon type={a.type} size={20} />}
                      label={a.name}
                    />
                  ))}
                </div>
              </Field>
            )}
          </>
        )}

        {type !== "transfer" && (
          <>
            <Field label="Description">
              <input
                className="input"
                placeholder="What's this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
            </Field>
            <Field label="Note">
              <textarea
                className="textarea"
                placeholder="Optional note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={1000}
              />
            </Field>
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Date">
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Time">
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <Button className="btn-block" onClick={save} loading={loading}>
            {isEdit ? "Update" : type === "transfer" ? "Transfer" : type === "income" ? "Add Income" : "Add Expense"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
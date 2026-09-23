import { useState } from "react";
import { ArrowRightLeft, CheckCircle, ClipboardList, Bell, Target, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Sheet } from "./UI.jsx";

const ACTIONS = [
  { key: "expense", label: "Expense", color: "ex" },
  { key: "income", label: "Income", color: "in" },
  { key: "transfer", label: "Transfer", color: "tr" },
  { key: "task", label: "Task", color: "tk" },
  { key: "note", label: "Note", color: "no" },
  { key: "reminder", label: "Reminder", color: "rm" },
  { key: "goal", label: "Goal", color: "go" },
];

export default function QuickAdd({ open, onClose, onSelect }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Add</h2>
      <div className="action-grid">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            className="action-item"
            onClick={() => {
              onClose();
              onSelect(a.key);
            }}
          >
            <div className={`action-circle ${a.color}`}>
              {a.key === "expense" ? (
                <ArrowDownToLine size={24} />
              ) : a.key === "income" ? (
                <ArrowUpFromLine size={24} />
              ) : a.key === "transfer" ? (
                <ArrowRightLeft size={24} />
              ) : a.key === "task" ? (
                <CheckCircle size={24} />
              ) : a.key === "note" ? (
                <ClipboardList size={24} />
              ) : a.key === "reminder" ? (
                <Bell size={24} />
              ) : (
                <Target size={24} />
              )}
            </div>
            <span className="action-label">{a.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
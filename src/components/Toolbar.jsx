import React from "react";
import "../styles/Toolbar.css";

const ITEMS = [
  { label: "Start", icon: "▶️", kind: "start" },
  { label: "Upload File", icon: "📂", kind: "upload" },
  { label: "Script", icon: "📜", kind: "script" },
  { label: "AI Model", icon: "🤖", kind: "ai" },
  { label: "CSV Analysis", icon: "📊", kind: "analysis" },
  { label: "Checks", icon: "✅", kind: "check" },

  // 🆕 New Nodes
  { label: "Cloud Function", icon: "☁️", kind: "cloud" },
  { label: "NLP", icon: "🧠", kind: "nlp" },
  { label: "Database", icon: "🗄️", kind: "db" },
  { label: "Editable", icon: "📝", kind: "editable" },
];

export default function Toolbar({ onAddClick, children }) {
  const onDragStart = (evt, item) => {
    evt.dataTransfer.setData("application/reactflow", JSON.stringify(item));
    evt.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        {ITEMS.map((item) => (
          <div
            key={item.label}
            className="tool"
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            onClick={() => onAddClick(item)}
            title={`Add ${item.label}`}
          >
            <span className="tool-emoji">{item.icon}</span>
            <span className="tool-label">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="toolbar-right">{children}</div>
    </div>
  );
}

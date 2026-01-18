import React, { useState } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import "../styles/Node.css";

const formatResult = (val) => {
  if (val == null) return "";
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
};

export default function Node({ selected, data }) {
  const icon = data?.icon ?? "🧩";
  const label = data?.label ?? "Node";
  const kind = data?.kind ?? "generic";
  const status = data?.status ?? "idle";

  return (
    <div className="node-shell">
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={90}
        lineStyle={{ stroke: "#4f9eed" }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: "#4f9eed",
        }}
      />

      <div className="node-body">
        {/* Title bar — hide icon + label for editable node */}
        {kind !== "editable" && (
          <div className="node-title">
            <span className="node-icon">{icon}</span>
            <span className="node-text">{label}</span>
            <span className={`badge badge-${status}`}>{status}</span>
          </div>
        )}

        <div className="node-content">
          {kind === "start" && <StartUI />}
          {kind === "upload" && <UploadUI data={data} />}
          {kind === "script" && <ScriptUI data={data} />}
          {kind === "ai" && <AIUI data={data} />}
          {kind === "analysis" && <AnalysisUI data={data} />}
          {kind === "check" && <CheckUI data={data} />}
          {kind === "cloud" && <CloudUI data={data} />}
          {kind === "nlp" && <NLPUI data={data} />}
          {kind === "db" && <DBUI data={data} />}
          {kind === "editable" && <EditableUI data={data} />}
        </div>

        {(data?.config?.lastMsg || data?.config?.lastResult) && (
          <div className="node-output">
            {data?.config?.lastMsg && (
              <div className="node-line">{data.config.lastMsg}</div>
            )}
            {data?.config?.lastResult && (
              <pre className="node-pre">
                {formatResult(data.config.lastResult)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Connection handles */}
      <Handle id="t" className="handle handle-top" type="target" position={Position.Top} />
      <Handle id="t-src" className="handle handle-top" type="source" position={Position.Top} />
      <Handle id="l" className="handle handle-left" type="target" position={Position.Left} />
      <Handle id="l-src" className="handle handle-left" type="source" position={Position.Left} />
      <Handle id="r" className="handle handle-right" type="target" position={Position.Right} />
      <Handle id="r-src" className="handle handle-right" type="source" position={Position.Right} />
      <Handle id="b" className="handle handle-bottom" type="target" position={Position.Bottom} />
      <Handle id="b-src" className="handle handle-bottom" type="source" position={Position.Bottom} />
    </div>
  );
}

/* ---------- Existing UIs ---------- */
function StartUI() {
  return (
    <div className="ui-row">
      <button
        className="btn tool"
        onClick={() => window.dispatchEvent(new CustomEvent("rf/run-from-start", {}))}
      >
        ▶️ Run
      </button>
    </div>
  );
}

function UploadUI({ data }) {
  return (
    <div className="ui-col">
      <input
        className="input"
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            window.dispatchEvent(
              new CustomEvent("rf/upload", { detail: { nodeId: data.id, file } })
            );
          }
        }}
      />
      <small className="hint">{data?.config?.filename || "No file selected"}</small>
    </div>
  );
}

function ScriptUI({ data }) {
  return (
    <div className="ui-col">
      <select
        className="input"
        value={data?.config?.script || "check_csv_present"}
        onChange={(e) => {
          window.dispatchEvent(
            new CustomEvent("rf/update-config", {
              detail: { nodeId: data.id, patch: { script: e.target.value } },
            })
          );
        }}
      >
        <option value="check_csv_present">Check CSV present</option>
        <option value="regen_model">Regenerate model</option>
      </select>
      <button
        className="btn tool"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("rf/run-node", { detail: { nodeId: data.id } }))
        }
      >
        ▶️ Run
      </button>
    </div>
  );
}

function AIUI({ data }) {
  return (
    <div className="ui-col">
      <input
        className="input"
        type="text"
        placeholder="Prompt or model cmd..."
        value={data?.config?.prompt || ""}
        onChange={(e) =>
          window.dispatchEvent(
            new CustomEvent("rf/update-config", {
              detail: { nodeId: data.id, patch: { prompt: e.target.value } },
            })
          )
        }
      />
      <button
        className="btn tool"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("rf/run-node", { detail: { nodeId: data.id } }))
        }
      >
        🤖 Run
      </button>
    </div>
  );
}

function AnalysisUI({ data }) {
  return (
    <div className="ui-col">
      <div className="ui-row">
        <button
          className="btn tool"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("rf/analysis", { detail: { nodeId: data.id, op: "row_count" } })
            )
          }
        >
          Rows
        </button>
        <button
          className="btn tool"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("rf/analysis", { detail: { nodeId: data.id, op: "unique_users" } })
            )
          }
        >
          Unique users
        </button>
      </div>
      <input
        className="input"
        type="text"
        placeholder='Question e.g. "how many users with no manager"'
        value={data?.config?.question || ""}
        onChange={(e) =>
          window.dispatchEvent(
            new CustomEvent("rf/update-config", {
              detail: { nodeId: data.id, patch: { question: e.target.value } },
            })
          )
        }
      />
      <button
        className="btn tool"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("rf/analysis", { detail: { nodeId: data.id, op: "question" } })
          )
        }
      >
        Ask
      </button>
    </div>
  );
}

function CheckUI({ data }) {
  return (
    <div className="ui-col">
      <button
        className="btn tool"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("rf/run-node", { detail: { nodeId: data.id } }))
        }
      >
        ✅ Run checks
      </button>
      <small className="hint">Examples: users without manager, invalid emails, etc.</small>
    </div>
  );
}

/* ---------- New Nodes ---------- */
function CloudUI({ data }) {
  return (
    <div className="ui-col">
      <input
        className="input"
        type="text"
        placeholder="Function name or endpoint"
        value={data?.config?.functionName || ""}
        onChange={(e) =>
          window.dispatchEvent(
            new CustomEvent("rf/update-config", {
              detail: { nodeId: data.id, patch: { functionName: e.target.value } },
            })
          )
        }
      />
      <button
        className="btn tool"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("rf/run-node", { detail: { nodeId: data.id } }))
        }
      >
        ☁️ Trigger
      </button>
    </div>
  );
}

function NLPUI({ data }) {
  return (
    <div className="ui-col">
      <textarea
        className="input"
        placeholder="Enter text for NLP processing..."
        value={data?.config?.text || ""}
        onChange={(e) =>
          window.dispatchEvent(
            new CustomEvent("rf/update-config", {
              detail: { nodeId: data.id, patch: { text: e.target.value } },
            })
          )
        }
      />
      <button
        className="btn tool"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("rf/run-node", { detail: { nodeId: data.id } }))
        }
      >
        🧠 Analyze
      </button>
    </div>
  );
}

function DBUI({ data }) {
  return (
    <div className="ui-col">
      <select
        className="input"
        value={data?.config?.operation || "read"}
        onChange={(e) =>
          window.dispatchEvent(
            new CustomEvent("rf/update-config", {
              detail: { nodeId: data.id, patch: { operation: e.target.value } },
            })
          )
        }
      >
        <option value="read">Read</option>
        <option value="write">Write</option>
        <option value="update">Update</option>
        <option value="delete">Delete</option>
      </select>
      <input
        className="input"
        type="text"
        placeholder="Table / Collection name"
        value={data?.config?.table || ""}
        onChange={(e) =>
          window.dispatchEvent(
            new CustomEvent("rf/update-config", {
              detail: { nodeId: data.id, patch: { table: e.target.value } },
            })
          )
        }
      />
      <button
        className="btn tool"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("rf/run-node", { detail: { nodeId: data.id } }))
        }
      >
        🗄️ Execute
      </button>
    </div>
  );
}

/* 📝 Editable Node — only text box */
function EditableUI({ data }) {
  const [content, setContent] = useState(data?.config?.content || "");
  return (
    <div className="ui-col">
      <textarea
        className="input"
        rows={4}
        placeholder="Type here..."
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          window.dispatchEvent(
            new CustomEvent("rf/update-config", {
              detail: { nodeId: data.id, patch: { content: e.target.value } },
            })
          );
        }}
        onMouseDown={(e) => e.stopPropagation()} // allow typing
        onKeyDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

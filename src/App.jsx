import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import Toolbar from "./components/Toolbar.jsx";
import Node from "./components/Node.jsx";
import "./styles/App.css";

const nodeTypes = { custom: Node };

// simple id generator
let idCounter = 1;
const getId = () => `node_${idCounter++}`;

function Canvas() {
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [history, setHistory] = useState([{ nodes: [], edges: [] }]);
  const [future, setFuture] = useState([]);

  // Global log for Output panel
  const [log, setLog] = useState([]);
  const pushLog = useCallback((line) => {
    const ts = new Date().toLocaleTimeString();
    setLog((l) => [...l.slice(-199), `[${ts}] ${line}`]);
  }, []);

  // Runtime store
  const runtimeRef = useRef({
    csv: null,
    csvMeta: null,
    lastAI: null,
    lastAnalysis: null,
  });

  const snapshot = useCallback(
    () => ({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    }),
    [nodes, edges]
  );

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h, snapshot()]);
    setFuture([]);
  }, [snapshot]);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#4f9eed", strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  const addNode = useCallback(
    (payload) => {
      const { label, icon, kind } = payload;
      const position = { x: 120 + Math.random() * 400, y: 100 + Math.random() * 300 };
      const id = getId();
      const newNode = {
        id,
        type: "custom",
        position,
        data: { id, label, icon, kind, status: "idle", config: {} },
      };
      setNodes((nds) => nds.concat(newNode));
      pushHistory();
    },
    [setNodes, pushHistory]
  );

  const onDragOver = useCallback((evt) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (evt) => {
      evt.preventDefault();
      const raw = evt.dataTransfer.getData("application/reactflow");
      if (!raw) return;

      const { label, icon, kind } = JSON.parse(raw);
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: evt.clientX - bounds.left,
        y: evt.clientY - bounds.top,
      });

      const id = getId();
      const newNode = {
        id,
        type: "custom",
        position,
        data: { id, label, icon, kind, status: "idle", config: {} },
      };
      setNodes((nds) => nds.concat(newNode));
      pushHistory();
    },
    [project, setNodes, pushHistory]
  );

  const deleteSelected = useCallback(() => {
    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    const selectedEdgeIds = new Set(edges.filter((e) => e.selected).map((e) => e.id));
    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;

    pushHistory();

    const remainingEdges = edges
      .filter((e) => !selectedEdgeIds.has(e.id))
      .filter((e) => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target));
    const remainingNodes = nodes.filter((n) => !selectedNodeIds.has(n.id));

    setEdges(remainingEdges);
    setNodes(remainingNodes);
  }, [nodes, edges, setNodes, setEdges, pushHistory]);

  const undo = useCallback(() => {
    if (history.length <= 1) return;
    const prev = history[history.length - 2];
    const current = history[history.length - 1];
    setFuture((f) => [current, ...f]);
    setHistory((h) => h.slice(0, -1));
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }, [history, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const [next, ...rest] = future;
    setHistory((h) => [...h, snapshot()]);
    setFuture(rest);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, setNodes, setEdges, snapshot]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if ((e.key === "Delete" || e.key === "Backspace") && !ctrlOrCmd) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (ctrlOrCmd && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (ctrlOrCmd && e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, deleteSelected]);

  const onNodesChangeWithHistory = useCallback(
    (changes) => {
      onNodesChange(changes);
      if (changes.some((c) => c.type === "position" && c.dragging === false)) {
        setHistory((h) => [...h, snapshot()]);
        setFuture([]);
      }
    },
    [onNodesChange, snapshot]
  );

  const onEdgesChangeWithHistory = useCallback(
    (changes) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // CSV parsing (simple)
  const parseCSV = useCallback((text) => {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = splitCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ?? "";
      });
      rows.push(row);
    }
    return rows;
  }, []);

  function splitCSVLine(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && (i === 0 || line[i - 1] !== "\\")) {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim().replace(/\\"/g, '"').replace(/^"(.*)"$/, "$1"));
  }

  // Node helpers
  const setNodeStatus = useCallback(
    (nodeId, status) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, status } } : n
        )
      );
    },
    [setNodes]
  );

  const patchNodeConfig = useCallback(
    (nodeId, patch) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } } }
            : n
        )
      );
    },
    [setNodes]
  );

  const getOutgoing = useCallback(
    (nodeId) => edges.filter((e) => e.source === nodeId).map((e) => e.target),
    [edges]
  );

  const findNode = useCallback((nodeId) => nodes.find((n) => n.id === nodeId), [nodes]);

  // Runners
  const runStart = useCallback(async () => ({ ok: true, msg: "Start" }), []);
  const runUpload = useCallback(async (nodeId) => {
    const node = findNode(nodeId);
    const filename = node?.data?.config?.filename;
    if (!filename) return { ok: false, msg: "No file selected." };
    return { ok: true, msg: `File ready: ${filename}`, data: runtimeRef.current.csvMeta };
  }, [findNode]);

  const runScript = useCallback(async () => {
    if (!runtimeRef.current.csv || runtimeRef.current.csv.length === 0) {
      return { ok: false, msg: "Metal frame stock status: we currently have a decent quantity in storage, assorted sizes available. Please verify the latest count before dispatching. \nRequesting for approval" };
    }
    return { ok: true, msg: "CSV present.", data: { rows: runtimeRef.current.csv.length } };
  }, []);

  const runAI = useCallback(async (nodeId) => {
    const node = findNode(nodeId);
    const prompt = node?.data?.config?.prompt || "Hello model";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      runtimeRef.current.lastAI = data?.reply ?? "";
      return { ok: true, msg: "AI reply received.", data: runtimeRef.current.lastAI };
    } catch {
      const mock = `(mock) Model response to: ${prompt.slice(0, 80)}`;
      runtimeRef.current.lastAI = mock;
      return { ok: true, msg: "Metal frame stock status: we currently have a decent quantity in storage, assorted sizes available. Please verify the latest count before dispatching. \nRequesting for approval", data: mock };
    }
  }, [findNode]);

  const runAnalysis = useCallback(async (opOverride) => {
    const csv = runtimeRef.current.csv || [];
    if (!csv.length) return { ok: false, msg: "CSV not loaded." };

    const op = opOverride || "row_count";
    if (op === "row_count") {
      runtimeRef.current.lastAnalysis = { type: "row_count", value: csv.length };
      return { ok: true, msg: `Rows: ${csv.length}`, data: runtimeRef.current.lastAnalysis };
    }
    if (op === "unique_users") {
      const key = ["user", "username", "email", "id"].find((k) => k in csv[0]) || Object.keys(csv);
      const uniq = new Set(csv.map((r) => r[key])).size;
      const data = { type: "unique", key, value: uniq };
      runtimeRef.current.lastAnalysis = data;
      return { ok: true, msg: `Unique by ${key}: ${uniq}`, data };
    }
    if (op === "question") {
      const q = "question"; // summary is already in msg; keep data placeholder
      return { ok: true, msg: "Answered (demo).", data: { type: "answer", value: q } };
    }
    return { ok: true, msg: `Analysis ${op} done.` };
  }, []);

  const runCheck = useCallback(async () => {
    const csv = runtimeRef.current.csv || [];
    if (!csv.length) return { ok: false, msg: "CSV not loaded." };
    const candidates = findNoManager(csv);
    return { ok: true, msg: `Found ${candidates.length} users with no manager.`, data: { noManager: candidates.length } };
  }, []);

  function findNoManager(csv) {
    const cols = csv.length ? Object.keys(csv[0]) : [];
    const key =
      ["manager", "manager_id", "manager_email", "managerName", "managerId"].find((k) =>
        cols.includes(k)
      ) || null;
    if (!key) return [];
    return csv.filter((r) => {
      const v = (r[key] ?? "").toString().trim();
      return v === "" || v === "null" || v === "undefined";
    });
  }

  const runNode = useCallback(
    async (nodeId, opOverride) => {
      const node = findNode(nodeId);
      if (!node) return { ok: false, msg: "Node not found." };
      const kind = node.data?.kind || "generic";
      setNodeStatus(nodeId, "running");

      let result = { ok: true, msg: "done" };
      try {
        if (kind === "start") result = await runStart();
        else if (kind === "upload") result = await runUpload(nodeId);
        else if (kind === "script") result = await runScript();
        else if (kind === "ai") result = await runAI(nodeId);
        else if (kind === "analysis") result = await runAnalysis(opOverride);
        else if (kind === "check") result = await runCheck();
        else result = { ok: true, msg: "......." };
      } catch (err) {
        result = { ok: false, msg: err?.message || "Error" };
      }

      setNodeStatus(nodeId, result.ok ? "success" : "error");
      // Push outputs into node for per-node output box
      const payload = { lastMsg: result.msg, lastResult: result.data ?? null };
      patchNodeConfig(nodeId, payload);
      // Log summary
      const label = node?.data?.label || nodeId;
      pushLog(`${label}: ${result.msg}`);

      return result;
    },
    [findNode, setNodeStatus, patchNodeConfig, runStart, runUpload, runScript, runAI, runAnalysis, runCheck, pushLog]
  );

  const runNodeAndNext = useCallback(
    async (nodeId) => {
      const res = await runNode(nodeId);
      if (!res.ok) return;
      const nextIds = getOutgoing(nodeId);
      if (nextIds.length > 0) {
        await runNodeAndNext(nextIds[0]);
      }
    },
    [runNode, getOutgoing]
  );

  // Events from Node UIs
  useEffect(() => {
    const onUpload = async (e) => {
      const { nodeId, file } = e.detail;
      const text = await file.text();
      const rows = parseCSV(text);
      runtimeRef.current.csv = rows;
      runtimeRef.current.csvMeta = { name: file.name, size: file.size };
      patchNodeConfig(nodeId, { filename: file.name });
      setNodeStatus(nodeId, "success");
      pushLog(`Upload: ${file.name} (${rows.length} rows)`);
    };

    const onUpdateConfig = (e) => {
      const { nodeId, patch } = e.detail;
      patchNodeConfig(nodeId, patch);
    };

    const onRunFromStart = () => {
      const startNode = nodes.find((n) => n.data?.kind === "start");
      if (startNode) runNodeAndNext(startNode.id);
    };

    const onRunNode = (e) => {
      const { nodeId } = e.detail;
      runNodeAndNext(nodeId);
    };

    const onAnalysis = (e) => {
      const { nodeId, op } = e.detail;
      runNode(nodeId, op).then((res) => {
        if (!res.ok) return;
        const nextIds = getOutgoing(nodeId);
        if (nextIds.length > 0) runNodeAndNext(nextIds[0]);
      });
    };

    window.addEventListener("rf/upload", onUpload);
    window.addEventListener("rf/update-config", onUpdateConfig);
    window.addEventListener("rf/run-from-start", onRunFromStart);
    window.addEventListener("rf/run-node", onRunNode);
    window.addEventListener("rf/analysis", onAnalysis);
    return () => {
      window.removeEventListener("rf/upload", onUpload);
      window.removeEventListener("rf/update-config", onUpdateConfig);
      window.removeEventListener("rf/run-from-start", onRunFromStart);
      window.removeEventListener("rf/run-node", onRunNode);
      window.removeEventListener("rf/analysis", onAnalysis);
    };
  }, [nodes, getOutgoing, runNodeAndNext, runNode, parseCSV, patchNodeConfig, setNodeStatus, pushLog]);

  return (
    <div className="app-root" ref={reactFlowWrapper}>
      <Toolbar onAddClick={addNode}>
        <div className="toolbar-actions">
          <button className="btn" onClick={undo} title="Undo (Ctrl/Cmd+Z)">↩️ Undo</button>
          <button className="btn" onClick={redo} title="Redo (Ctrl/Cmd+Shift+Z)">↪️ Redo</button>
          <button className="btn" onClick={deleteSelected} title="Delete (Del/Backspace)">🗑️ Delete</button>
        </div>
      </Toolbar>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChangeWithHistory}
        onEdgesChange={onEdgesChangeWithHistory}
        onConnect={(params) => { pushHistory(); onConnect(params); }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#3a3a3a" gap={18} />
        <Controls />
      </ReactFlow>

      {/* Floating global output panel */}
      <div className="output-panel">
        <div className="output-header">Output</div>
        <div className="output-body">
          {log.map((line, i) => (
            <div key={i} className="output-line">{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}

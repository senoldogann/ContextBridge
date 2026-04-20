import { useEffect, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Cpu,
  FileText,
  GitBranch,
  Clock,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  FileEdit,
} from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useProjectStore } from "@/stores/projectStore";
import { useNavigationStore } from "@/stores/navigationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { TabGroup } from "@/components/ui/Tab";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ToolLogo } from "@/components/ui/ToolLogo";
import { formatAppDateTime } from "@/lib/datetime";
import type { ContextNote, SyncResult, SyncState } from "@/types";

// ─── Overview Tab ──────────────────────────────────────────────
function OverviewTab() {
  const context = useProjectStore((s) => {
    const sel = s.selectedProject;
    return sel ? s.contextMap[sel.id] : undefined;
  });

  if (!context) {
    return <p className="text-sm text-zinc-500">Loading context…</p>;
  }

  const { tech_stack, recent_changes } = context;
  const latestCommit = recent_changes[0];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <section>
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "var(--primary-muted)" }}
              >
                <Cpu size={16} style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Technologies
                </p>
                <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {tech_stack.length}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "var(--accent-muted)" }}
              >
                <FileText size={16} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Notes
                </p>
                <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {context.notes.length}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "var(--primary-muted)" }}
              >
                <Clock size={16} style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Changes
                </p>
                <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {recent_changes.length}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Tech Stack */}
      <section>
        <h4
          className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          <Cpu size={12} />
          Tech Stack
        </h4>
        {tech_stack.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center py-4 text-center">
              <Cpu size={24} style={{ color: "var(--text-muted)" }} />
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                No technologies detected yet.
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                Run a scan to detect your project's tech stack.
              </p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tech_stack.map((t) => (
              <Badge key={t.id} variant="primary">
                {t.category}: {t.name}
                {t.version ? ` v${t.version}` : ""}
              </Badge>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <h4
          className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          <GitBranch size={12} />
          Recent Activity
        </h4>
        {latestCommit ? (
          <Card>
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--primary-muted)" }}
              >
                <GitBranch size={13} style={{ color: "var(--primary)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {latestCommit.summary}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  {latestCommit.commit_hash && (
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-xs"
                      style={{
                        background: "var(--primary-muted)",
                        color: "var(--primary)",
                      }}
                    >
                      {latestCommit.commit_hash.slice(0, 7)}
                    </span>
                  )}
                  {latestCommit.author && (
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {latestCommit.author}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatAppDateTime(latestCommit.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="flex flex-col items-center py-4 text-center">
              <GitBranch size={24} style={{ color: "var(--text-muted)" }} />
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                No recent changes recorded.
              </p>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

// ─── Context Notes Tab ─────────────────────────────────────────
function NotesTab() {
  const context = useProjectStore((s) => {
    const sel = s.selectedProject;
    return sel ? s.contextMap[sel.id] : undefined;
  });
  const addNote = useProjectStore((s) => s.addNote);
  const deleteNote = useProjectStore((s) => s.deleteNote);
  const updateNote = useProjectStore((s) => s.updateNote);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "other", title: "", content: "", priority: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    category: "other",
    title: "",
    content: "",
    priority: 0,
  });

  const notes = context?.notes ?? [];
  const projectId = context?.project.id;

  const grouped = notes.reduce<Record<string, ContextNote[]>>((acc, note) => {
    const cat = note.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(note);
    return acc;
  }, {});

  const handleSubmit = async () => {
    if (!projectId) return;
    const trimmedTitle = form.title.trim();
    const trimmedContent = form.content.trim();
    if (!trimmedTitle) return;
    const clampedPriority = Math.max(0, Math.min(10, form.priority));
    await addNote(projectId, form.category, trimmedTitle, trimmedContent, clampedPriority);
    setForm({ category: "other", title: "", content: "", priority: 0 });
    setShowForm(false);
  };

  const handleDelete = async (noteId: string) => {
    if (!projectId) return;
    await deleteNote(projectId, noteId);
    toast.success("Note deleted");
  };

  const handleEdit = (note: ContextNote) => {
    setEditingNote(note.id);
    setEditForm({
      category: note.category,
      title: note.title,
      content: note.content,
      priority: note.priority,
    });
  };

  const handleEditSubmit = async (noteId: string) => {
    if (!projectId) return;
    const trimmedTitle = editForm.title.trim();
    if (!trimmedTitle) return;
    const clampedPriority = Math.max(0, Math.min(10, editForm.priority));
    await updateNote(
      projectId,
      noteId,
      editForm.category,
      trimmedTitle,
      editForm.content.trim(),
      clampedPriority,
    );
    setEditingNote(null);
    toast.success("Note updated");
  };

  const priorityBadge = (p: number) => {
    if (p >= 8) return <Badge variant="danger">high</Badge>;
    if (p >= 4) return <Badge variant="warning">medium</Badge>;
    return <Badge variant="default">low</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4
          className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          <FileText size={12} />
          Context Notes ({notes.length})
        </h4>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Add Note
        </Button>
      </div>

      {showForm && (
        <Card className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-md px-3 py-1.5 text-sm focus:outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                {[
                  "architecture",
                  "conventions",
                  "dependencies",
                  "patterns",
                  "testing",
                  "deployment",
                  "other",
                ].map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>
                Priority (0-10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full rounded-md px-3 py-1.5 text-sm focus:outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Note title"
              className="w-full rounded-md px-3 py-1.5 text-sm focus:outline-none"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>
              Content
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Note content"
              rows={3}
              className="w-full rounded-md px-3 py-1.5 text-sm focus:outline-none"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <FileText size={28} style={{ color: "var(--text-muted)" }} />
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              No notes yet.
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
              Add context notes to enrich your AI tool configurations.
            </p>
          </div>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, catNotes]) => (
          <div key={category}>
            <h5
              className="mb-2 text-xs font-medium tracking-wider uppercase"
              style={{ color: "var(--text-muted)" }}
            >
              {category}
            </h5>
            <div className="space-y-2">
              {catNotes.map((note) => (
                <Card key={note.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {editingNote === note.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={editForm.category}
                              onChange={(e) =>
                                setEditForm({ ...editForm, category: e.target.value })
                              }
                              className="w-full rounded-md px-2 py-1 text-xs focus:outline-none"
                              style={{
                                background: "var(--bg-input)",
                                border: "1px solid var(--border)",
                                color: "var(--text-primary)",
                              }}
                            >
                              {[
                                "architecture",
                                "conventions",
                                "dependencies",
                                "patterns",
                                "testing",
                                "deployment",
                                "other",
                              ].map((c) => (
                                <option key={c} value={c}>
                                  {c.charAt(0).toUpperCase() + c.slice(1)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={editForm.priority}
                              onChange={(e) =>
                                setEditForm({ ...editForm, priority: Number(e.target.value) })
                              }
                              className="w-full rounded-md px-2 py-1 text-xs focus:outline-none"
                              style={{
                                background: "var(--bg-input)",
                                border: "1px solid var(--border)",
                                color: "var(--text-primary)",
                              }}
                              placeholder="Priority"
                            />
                          </div>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full rounded-md px-2 py-1 text-sm focus:outline-none"
                            style={{
                              background: "var(--bg-input)",
                              border: "1px solid var(--border)",
                              color: "var(--text-primary)",
                            }}
                          />
                          <textarea
                            value={editForm.content}
                            onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                            rows={3}
                            className="w-full rounded-md px-2 py-1 text-sm focus:outline-none"
                            style={{
                              background: "var(--bg-input)",
                              border: "1px solid var(--border)",
                              color: "var(--text-primary)",
                            }}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleEditSubmit(note.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingNote(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="text-left"
                            onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                            aria-label={`Toggle note: ${note.title}`}
                          >
                            <h6
                              className="text-sm font-medium"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {note.title}
                            </h6>
                          </button>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge>{note.source}</Badge>
                            {priorityBadge(note.priority)}
                          </div>
                          {expandedId === note.id && (
                            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                              {note.content}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {editingNote !== note.id && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(note)}
                          className="rounded-md p-1 transition-colors"
                          style={{ color: "var(--text-muted)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                            (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                          aria-label={`Edit note: ${note.title}`}
                        >
                          <FileEdit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          className="rounded-md p-1 transition-colors"
                          style={{ color: "var(--text-muted)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "#f87171";
                            (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                          aria-label={`Delete note: ${note.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Sync Tab ──────────────────────────────────────────────────
const SYNC_TARGETS = ["claude", "cursor", "copilot", "codex"] as const;
const SYNC_TARGET_LABELS: Record<(typeof SYNC_TARGETS)[number], string> = {
  claude: "Claude",
  cursor: "Cursor",
  copilot: "Copilot",
  codex: "Codex",
};

function syncStatusIcon(target: string, syncStates: SyncState[]) {
  const state = syncStates.find((s) => s.target === target);
  if (!state) return <XCircle size={14} className="text-red-400" />;
  return <CheckCircle2 size={14} className="text-emerald-400" />;
}

function syncStatusLabel(target: string, syncStates: SyncState[]) {
  const state = syncStates.find((s) => s.target === target);
  if (!state) return "Never synced";
  return `Synced ${formatAppDateTime(state.synced_at)}`;
}

function syncResultBadge(result: SyncResult) {
  if (result.written) {
    return {
      label: "Updated",
      description: "Generated output changed, so Context Bridge rewrote this file.",
      variant: "success" as const,
    };
  }

  return {
    label: "No changes",
    description: "This target was checked and already matched the latest generated context.",
    variant: "primary" as const,
  };
}

function summarizeSyncRun(results: SyncResult[]) {
  const total = results.length;
  const updated = results.filter((result) => result.written).length;
  const unchanged = total - updated;
  const targetLabel = total === 1 ? "target" : "targets";

  return {
    total,
    updated,
    unchanged,
    message: `Checked ${total} ${targetLabel}: ${updated} updated, ${unchanged} unchanged.`,
  };
}

function SyncTab() {
  const context = useProjectStore((s) => {
    const sel = s.selectedProject;
    return sel ? s.contextMap[sel.id] : undefined;
  });
  const syncTarget = useProjectStore((s) => s.syncTarget);
  const syncAll = useProjectStore((s) => s.syncAll);
  const enabledAdapters = useSettingsStore((s) => s.enabledAdapters);

  const [syncing, setSyncing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SyncResult>>({});

  const projectId = context?.project.id;
  const syncStates = context?.sync_state ?? [];
  const enabledTargets = new Set(enabledAdapters);
  const syncRun = Object.keys(results).length > 0 ? summarizeSyncRun(Object.values(results)) : null;

  const handleSync = async (target: string) => {
    if (!projectId) return;
    setSyncing(target);
    try {
      const result = await syncTarget(projectId, target);
      setResults((prev) => ({ ...prev, [target]: result }));
      toast.success(summarizeSyncRun([result]).message);
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    if (!projectId) return;
    setSyncing("all");
    try {
      const allResults = await syncAll(projectId);
      const mapped: Record<string, SyncResult> = {};
      for (const r of allResults) {
        mapped[r.target] = r;
      }
      setResults(mapped);
      if (allResults.length > 0) {
        toast.success(summarizeSyncRun(allResults).message);
      }
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4
          className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          <Send size={12} />
          Sync Targets
        </h4>
        <Button
          size="sm"
          onClick={handleSyncAll}
          disabled={syncing !== null || enabledAdapters.length === 0}
        >
          <Send size={14} />
          {enabledAdapters.length === 0
            ? "No enabled adapters"
            : syncing === "all"
              ? "Syncing…"
              : "Sync All"}
        </Button>
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Syncing checks each enabled adapter and rewrites only the files whose generated content has
        changed.
      </p>

      {syncRun && (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{syncRun.updated} updated</Badge>
            <Badge variant="primary">{syncRun.unchanged} unchanged</Badge>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {syncRun.message}
            </span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SYNC_TARGETS.map((target) => {
          const state = syncStates.find((s) => s.target === target);
          const result = results[target];
          const isEnabled = enabledTargets.has(target);
          const resultBadge = result ? syncResultBadge(result) : null;

          return (
            <Card key={target}>
              {/* Card header with tool branding */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--bg-hover)" }}
                  >
                    <ToolLogo tool={target} size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h5
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {SYNC_TARGET_LABELS[target]}
                      </h5>
                      {!isEnabled && <Badge variant="default">Off</Badge>}
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {syncStatusIcon(target, syncStates)}
                      <span>{syncStatusLabel(target, syncStates)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSync(target)}
                  disabled={syncing !== null || !isEnabled}
                  aria-label={`Sync to ${target}`}
                >
                  {syncing === target ? "Syncing…" : isEnabled ? "Sync" : "Disabled"}
                </Button>
              </div>

              {/* Metadata */}
              {state && (
                <div
                  className="mt-3 space-y-0.5 rounded-md px-2.5 py-2 text-xs"
                  style={{
                    background: "var(--bg-base)",
                    color: "var(--text-muted)",
                  }}
                >
                  <p className="truncate" title={state.output_path}>
                    Path: {state.output_path}
                  </p>
                  <p className="font-mono" title={state.content_hash}>
                    Hash: {state.content_hash.slice(0, 12)}…
                  </p>
                </div>
              )}

              {/* Sync result */}
              {result && (
                <div className="mt-2 flex items-center gap-1.5">
                  <Badge variant={resultBadge?.variant}>{resultBadge?.label}</Badge>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {resultBadge?.description}
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recent Changes Tab ────────────────────────────────────────
function ChangesTab() {
  const context = useProjectStore((s) => {
    const sel = s.selectedProject;
    return sel ? s.contextMap[sel.id] : undefined;
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const changes = context?.recent_changes ?? [];

  const typeBadgeVariant = (changeType: string) => {
    switch (changeType) {
      case "commit":
        return "primary" as const;
      case "file_change":
        return "warning" as const;
      default:
        return "default" as const;
    }
  };

  if (changes.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center py-6 text-center">
          <Clock size={28} style={{ color: "var(--text-muted)" }} />
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            No recent changes recorded.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {changes.map((change) => {
        let files: string[] = [];
        try {
          const parsed: unknown = JSON.parse(change.files);
          if (Array.isArray(parsed)) files = parsed as string[];
        } catch {
          if (change.files) files = [change.files];
        }

        return (
          <Card key={change.id}>
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    change.change_type === "file_change"
                      ? "rgba(251, 191, 36, 0.12)"
                      : "var(--primary-muted)",
                }}
              >
                {change.change_type === "file_change" ? (
                  <FileEdit size={13} className="text-amber-400" />
                ) : (
                  <GitBranch size={13} style={{ color: "var(--primary)" }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {change.commit_hash && (
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-xs"
                      style={{
                        background: "var(--primary-muted)",
                        color: "var(--primary)",
                      }}
                    >
                      {change.commit_hash.slice(0, 7)}
                    </span>
                  )}
                  <Badge variant={typeBadgeVariant(change.change_type)}>{change.change_type}</Badge>
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--text-primary)" }}>
                  {change.summary}
                </p>
                <div
                  className="mt-1 flex items-center gap-2 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {change.author && <span>{change.author}</span>}
                  <span>{formatAppDateTime(change.timestamp)}</span>
                </div>

                {files.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === change.id ? null : change.id)}
                    className="mt-1 text-xs transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    }}
                    aria-label="Toggle file list"
                  >
                    {expandedId === change.id ? "Hide" : "Show"} {files.length} file
                    {files.length !== 1 ? "s" : ""}
                  </button>
                )}
                {expandedId === change.id && files.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {files.map((f) => (
                      <li
                        key={f}
                        className="truncate font-mono text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Project Detail Page ───────────────────────────────────────
export function ProjectDetail() {
  const project = useProjectStore((s) => s.selectedProject);
  const loadContext = useProjectStore((s) => s.loadContext);
  const refreshProject = useProjectStore((s) => s.refreshProject);
  const navigate = useNavigationStore((s) => s.navigate);
  const [refreshing, setRefreshing] = useState(false);

  const projectId = project?.id;

  useEffect(() => {
    if (projectId) void loadContext(projectId);
  }, [projectId, loadContext]);

  useEffect(() => {
    if (!project) navigate("dashboard");
  }, [project, navigate]);

  if (!project) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProject(project.id);
    } finally {
      setRefreshing(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <Cpu size={14} />, content: <OverviewTab /> },
    { id: "notes", label: "Notes", icon: <FileText size={14} />, content: <NotesTab /> },
    { id: "sync", label: "Sync", icon: <Send size={14} />, content: <SyncTab /> },
    { id: "changes", label: "Changes", icon: <Clock size={14} />, content: <ChangesTab /> },
  ];

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3"
        >
          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="rounded-md p-1.5 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            }}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{project.name}</h2>
            <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
              {project.root_path}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh project context"
          >
            <RefreshCw size={14} className={clsx(refreshing && "animate-spin")} />
            {refreshing ? "Scanning…" : "Refresh"}
          </Button>
        </motion.div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <TabGroup tabs={tabs} defaultTab="overview" />
      </div>
    </main>
  );
}

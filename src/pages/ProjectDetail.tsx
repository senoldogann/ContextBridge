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
} from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useProjectStore } from "@/stores/projectStore";
import { useNavigationStore } from "@/stores/navigationStore";
import { TabGroup } from "@/components/ui/Tab";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
      {/* Tech Stack */}
      <section>
        <h4 className="mb-3 text-sm font-semibold text-zinc-300">Tech Stack</h4>
        {tech_stack.length === 0 ? (
          <p className="text-xs text-zinc-500">No technologies detected. Run a scan first.</p>
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

      {/* Git Info */}
      <section>
        <h4 className="mb-3 text-sm font-semibold text-zinc-300">Recent Activity</h4>
        {latestCommit ? (
          <Card>
            <div className="flex items-start gap-3">
              <GitBranch size={16} className="mt-0.5 shrink-0 text-zinc-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-200">{latestCommit.summary}</p>
                <div className="mt-1 flex items-center gap-2">
                  {latestCommit.commit_hash && (
                    <span className="font-mono text-xs text-zinc-500">
                      {latestCommit.commit_hash.slice(0, 7)}
                    </span>
                  )}
                  {latestCommit.author && (
                    <span className="text-xs text-zinc-500">{latestCommit.author}</span>
                  )}
                  <span className="text-xs text-zinc-600">
                    {new Date(latestCommit.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <p className="text-xs text-zinc-500">No recent changes recorded.</p>
        )}
      </section>

      {/* Stats */}
      <section>
        <h4 className="mb-3 text-sm font-semibold text-zinc-300">Summary</h4>
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-indigo-400" />
              <span className="text-xs text-zinc-400">Technologies</span>
            </div>
            <p className="mt-1 text-xl font-bold text-zinc-100">{tech_stack.length}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-indigo-400" />
              <span className="text-xs text-zinc-400">Notes</span>
            </div>
            <p className="mt-1 text-xl font-bold text-zinc-100">{context.notes.length}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-indigo-400" />
              <span className="text-xs text-zinc-400">Changes</span>
            </div>
            <p className="mt-1 text-xl font-bold text-zinc-100">{recent_changes.length}</p>
          </Card>
        </div>
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

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "other", title: "", content: "", priority: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const priorityBadge = (p: number) => {
    if (p >= 8) return <Badge variant="danger">high</Badge>;
    if (p >= 4) return <Badge variant="warning">medium</Badge>;
    return <Badge variant="default">low</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-300">Context Notes ({notes.length})</h4>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Add Note
        </Button>
      </div>

      {showForm && (
        <Card className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
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
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Priority (0-10)</label>
              <input
                type="number"
                min={0}
                max={10}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Note title"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Note content"
              rows={3}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
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
        <p className="text-xs text-zinc-500">No notes yet. Add one to get started.</p>
      ) : (
        Object.entries(grouped).map(([category, catNotes]) => (
          <div key={category}>
            <h5 className="mb-2 text-xs font-medium tracking-wider text-zinc-500 uppercase">
              {category}
            </h5>
            <div className="space-y-2">
              {catNotes.map((note) => (
                <Card key={note.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                        aria-label={`Toggle note: ${note.title}`}
                      >
                        <h6 className="text-sm font-medium text-zinc-200">{note.title}</h6>
                      </button>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge>{note.source}</Badge>
                        {priorityBadge(note.priority)}
                      </div>
                      {expandedId === note.id && (
                        <p className="mt-2 text-sm text-zinc-400">{note.content}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      className="shrink-0 rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
                      aria-label={`Delete note: ${note.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
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

function syncStatusIcon(target: string, syncStates: SyncState[]) {
  const state = syncStates.find((s) => s.target === target);
  if (!state) return <XCircle size={14} className="text-red-400" />;
  return <CheckCircle2 size={14} className="text-emerald-400" />;
}

function syncStatusLabel(target: string, syncStates: SyncState[]) {
  const state = syncStates.find((s) => s.target === target);
  if (!state) return "Never synced";
  return `Synced ${new Date(state.synced_at).toLocaleString()}`;
}

function SyncTab() {
  const context = useProjectStore((s) => {
    const sel = s.selectedProject;
    return sel ? s.contextMap[sel.id] : undefined;
  });
  const syncTarget = useProjectStore((s) => s.syncTarget);
  const syncAll = useProjectStore((s) => s.syncAll);

  const [syncing, setSyncing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SyncResult>>({});

  const projectId = context?.project.id;
  const syncStates = context?.sync_state ?? [];

  const handleSync = async (target: string) => {
    if (!projectId) return;
    setSyncing(target);
    try {
      const result = await syncTarget(projectId, target);
      setResults((prev) => ({ ...prev, [target]: result }));
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
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-300">Sync Targets</h4>
        <Button size="sm" onClick={handleSyncAll} disabled={syncing !== null}>
          <Send size={14} /> {syncing === "all" ? "Syncing…" : "Sync All"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SYNC_TARGETS.map((target) => {
          const state = syncStates.find((s) => s.target === target);
          const result = results[target];

          return (
            <Card key={target}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {syncStatusIcon(target, syncStates)}
                  <h5 className="text-sm font-semibold text-zinc-200 capitalize">{target}</h5>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSync(target)}
                  disabled={syncing !== null}
                  aria-label={`Sync to ${target}`}
                >
                  {syncing === target ? "Syncing…" : "Sync"}
                </Button>
              </div>

              <div className="mt-3 space-y-1 text-xs text-zinc-500">
                <p>{syncStatusLabel(target, syncStates)}</p>
                {state && (
                  <>
                    <p className="truncate" title={state.output_path}>
                      Path: {state.output_path}
                    </p>
                    <p className="font-mono" title={state.content_hash}>
                      Hash: {state.content_hash.slice(0, 12)}…
                    </p>
                  </>
                )}
              </div>

              {result && (
                <div className="mt-2 flex items-center gap-1.5">
                  {result.written ? (
                    <Badge variant="success">✅ Written</Badge>
                  ) : (
                    <Badge variant="warning">⚠️ Up to date</Badge>
                  )}
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
    return <p className="text-sm text-zinc-500">No recent changes recorded.</p>;
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
              <GitBranch size={14} className="mt-1 shrink-0 text-zinc-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {change.commit_hash && (
                    <span className="font-mono text-xs text-indigo-400">
                      {change.commit_hash.slice(0, 7)}
                    </span>
                  )}
                  <Badge variant={typeBadgeVariant(change.change_type)}>{change.change_type}</Badge>
                </div>
                <p className="mt-1 text-sm text-zinc-200">{change.summary}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                  {change.author && <span>{change.author}</span>}
                  <span>{new Date(change.timestamp).toLocaleString()}</span>
                </div>

                {files.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === change.id ? null : change.id)}
                    className="mt-1 text-xs text-zinc-500 hover:text-zinc-300"
                    aria-label="Toggle file list"
                  >
                    {expandedId === change.id ? "Hide" : "Show"} {files.length} file
                    {files.length !== 1 ? "s" : ""}
                  </button>
                )}
                {expandedId === change.id && files.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {files.map((f) => (
                      <li key={f} className="truncate font-mono text-xs text-zinc-500">
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
    { id: "overview", label: "Overview", content: <OverviewTab /> },
    { id: "notes", label: "Notes", content: <NotesTab /> },
    { id: "sync", label: "Sync", content: <SyncTab /> },
    { id: "changes", label: "Changes", content: <ChangesTab /> },
  ];

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3"
        >
          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{project.name}</h2>
            <p className="truncate text-xs text-zinc-400">{project.root_path}</p>
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

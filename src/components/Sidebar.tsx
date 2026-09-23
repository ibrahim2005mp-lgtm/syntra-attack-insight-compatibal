import {
  Activity,
  ChevronLeft,
  CircleUserRound,
  History,
  Info,
  Menu,
  Radar,
  Share,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  readHistory,
  subscribeToConversationStore,
} from "@/hooks/conversationStore";
import type { HistoryItem } from "@/types/investigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SyntraLogo, SyntraMark } from "./Logo";

export type SyntraView = "investigate" | "history" | "about";

interface SidebarProps {
  active: SyntraView;
  onNavigate: (view: SyntraView) => void;
  /** Mobile drawer visibility. */
  open: boolean;
  onClose: () => void;
  apiOnline: boolean;
  /** Restore a stored conversation by any of its turn ids (Recent click). */
  onRestoreInvestigation: (id: string) => void;
  /** Thread id of the conversation currently open in the workspace. */
  activeThreadId: string | null;
}

const STORAGE_KEY = "syntra.sidebar.collapsed";

/** How many recent investigation titles to show in the sidebar. */
const RECENT_LIMIT = 12;

/**
 * One row in the Recent list: title + share action. Conversations live for
 * the browser session; clicking a row restores it in the workspace.
 */
function RecentItem({
  item,
  active,
  onOpen,
}: {
  item: HistoryItem;
  active: boolean;
  onOpen: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleShare = () => {
    const url = `${window.location.origin}/investigate?id=${encodeURIComponent(item.threadId)}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        toast.success("Link copied", {
          description: "Anyone with this link can open the investigation in this session.",
        });
      })
      .catch(() => {
        toast.error("Copy failed", { description: "Clipboard access was denied." });
      });
  };

  return (
    <div
      className={cn("syn-recent-item group", active && "active")}
      data-menu-open={menuOpen ? "true" : undefined}
      aria-current={active ? "true" : undefined}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        title={item.question}
        onClick={() => onOpen(item.id)}
      >
        <span className="syn-recent-title">{item.question}</span>
      </button>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label={`Actions for ${item.question}`}
          >
            <Share className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="min-w-44">
          <DropdownMenuItem onClick={handleShare}>
            <Share className="size-4" />
            Share
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Inner nav used by both the desktop sidebar and the mobile drawer. */
function SidebarContent({
  active,
  onNavigate,
  collapsed,
  apiOnline,
  onToggleCollapse,
  onNavigateAway,
  onRestoreInvestigation,
  activeThreadId,
}: {
  active: SyntraView;
  onNavigate: (view: SyntraView) => void;
  collapsed: boolean;
  apiOnline: boolean;
  onToggleCollapse?: () => void;
  onNavigateAway: () => void;
  onRestoreInvestigation: (id: string) => void;
  activeThreadId: string | null;
}) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  // In-memory store is synchronous, so state initializes from it directly;
  // the effect only subscribes to later changes.
  const [recent, setRecent] = useState<HistoryItem[] | null>(() => readHistory());

  useEffect(() => {
    return subscribeToConversationStore(() => setRecent(readHistory()));
  }, []);

  const go = (view: SyntraView) => {
    onNavigate(view);
    onNavigateAway();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate("/");
    }
  };

  return (
    <>
      {/* Brand — the mark doubles as the expand control when collapsed */}
      <div className={cn("flex items-center gap-2.5 px-4 pb-2 pt-5", collapsed && "justify-center px-0")}>
        {collapsed ? (
          onToggleCollapse ? (
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-sidebar-accent"
              aria-label="Expand sidebar"
              title="Expand sidebar"
              onClick={onToggleCollapse}
            >
              <SyntraMark size={26} />
            </button>
          ) : (
            <SyntraMark size={26} />
          )
        ) : (
          <SyntraLogo size={26} />
        )}
        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            className="ml-auto flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Collapse sidebar"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Primary navigation */}
      <nav className="mt-2 flex flex-col gap-1 px-2.5" aria-label="Primary">
        <button type="button" className={cn("syn-nav-item", active === "investigate" && "active")} onClick={() => go("investigate")} title="Investigate">
          <Radar className="size-4 shrink-0" />
          {!collapsed && <span>Investigate</span>}
        </button>
        <button type="button" className={cn("syn-nav-item", active === "history" && "active")} onClick={() => go("history")} title="History">
          <History className="size-4 shrink-0" />
          {!collapsed && <span>History</span>}
        </button>
        <button type="button" className={cn("syn-nav-item", active === "about" && "active")} onClick={() => go("about")} title="About">
          <Info className="size-4 shrink-0" />
          {!collapsed && <span>About</span>}
        </button>
      </nav>

      {/* Recent investigations — chat-title style; hidden while collapsed */}
      {!collapsed && (
        <>
          <hr className="syn-nav-divider" />
          <p className="syn-section-title px-4 pb-1.5 pt-1">Recent</p>
          {recent === null ? (
            <div className="syn-recent-list px-1.5 pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="syn-sweep h-6 rounded-md" aria-hidden="true" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="px-4 pb-2 text-[11px] leading-relaxed text-muted-foreground">
              Conversations you start appear here for this session so you can reopen them.
            </p>
          ) : (
            <div className="syn-recent-list" role="list" aria-label="Recent conversations">
              {recent.slice(0, RECENT_LIMIT).map((item) => (
                <div key={item.threadId} role="listitem">
                  <RecentItem
                    item={item}
                    active={item.threadId === activeThreadId}
                    onOpen={(id) => {
                      onRestoreInvestigation(id);
                      onNavigateAway();
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex-1" />

      {/* Status + account */}
      <div className="flex flex-col gap-1 px-2.5 pb-4">
        <hr className="syn-nav-divider mt-0 mb-1" />
        <div className={cn("syn-nav-item", "pointer-events-none")} title="Security Status">
          <ShieldCheck className="size-4 shrink-0 text-[var(--syntra-success)]" />
          {!collapsed && <span>Security Status</span>}
          {!collapsed && <span className="ml-auto text-[10px] tracking-wide text-[var(--syntra-success)]">OK</span>}
        </div>
        <div className="syn-nav-item pointer-events-none" title="Frontend Status">
          <Activity className={cn("size-4 shrink-0", apiOnline ? "text-[var(--syntra-success)]" : "text-[var(--syntra-danger)]")} />
          {!collapsed && <span>Frontend Status</span>}
          {!collapsed && (
            <span className={cn("ml-auto text-[10px] tracking-wide", apiOnline ? "text-[var(--syntra-success)]" : "text-[var(--syntra-danger)]")}>
              {apiOnline ? "Online" : "Offline"}
            </span>
          )}
        </div>
        {user && !collapsed && (
          <div className="syn-nav-item pointer-events-none" title="Session">
            <CircleUserRound className="size-4 shrink-0" />
            <span>Session</span>
          </div>
        )}
        {!collapsed && (
          <button type="button" className="syn-nav-item" onClick={handleSignOut}>
            <X className="size-4 shrink-0" />
            <span>End session</span>
          </button>
        )}
      </div>

      {collapsed && onToggleCollapse && (
        <button
          type="button"
          className="mx-auto mb-4 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          aria-label="Expand sidebar"
          onClick={onToggleCollapse}
        >
          <Menu className="size-4" />
        </button>
      )}
    </>
  );
}

export function Sidebar({
  active,
  onNavigate,
  open,
  onClose,
  apiOnline,
  onRestoreInvestigation,
  activeThreadId,
}: SidebarProps) {
  // Read the persisted preference lazily so no effect-driven setState is needed.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage failures; UI state only.
      }
      return next;
    });
  }, []);

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside
        className={cn("syn-sidebar hidden md:flex", collapsed && "collapsed")}
        aria-label="SYNTRA navigation"
      >
        {/* Keyed by collapsed state so the entrance animation replays on expand */}
        <div className="syn-sidebar-inner" key={collapsed ? "collapsed" : "expanded"}>
          <SidebarContent
            active={active}
            onNavigate={onNavigate}
            collapsed={collapsed}
            apiOnline={apiOnline}
            onToggleCollapse={toggleCollapsed}
            onNavigateAway={() => undefined}
            onRestoreInvestigation={onRestoreInvestigation}
            activeThreadId={activeThreadId}
          />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="SYNTRA navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <div className="syn-sidebar absolute inset-y-0 left-0 w-64 shadow-2xl">
            <SidebarContent
              active={active}
              onNavigate={onNavigate}
              collapsed={false}
              apiOnline={apiOnline}
              onNavigateAway={onClose}
              onRestoreInvestigation={onRestoreInvestigation}
              activeThreadId={activeThreadId}
            />
          </div>
        </div>
      )}
    </>
  );
}

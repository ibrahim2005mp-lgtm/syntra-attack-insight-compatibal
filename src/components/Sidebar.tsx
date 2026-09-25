import {
  Archive,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Ellipsis,
  History,
  Info,
  LifeBuoy,
  LogOut,
  Menu,
  Pencil,
  Pin,
  PinOff,
  Radar,
  Settings,
  Share,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { validateInvestigationTitle } from "@/security/inputValidation";
import {
  readHistory,
  subscribeToConversationStore,
  renameThread,
  setThreadPinned,
  setThreadArchived,
  deleteThread,
} from "@/hooks/conversationStore";
import type { HistoryItem } from "@/types/investigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SyntraLogo, SyntraMark } from "./Logo";

export type SyntraView = "investigate" | "history" | "about";

interface SidebarProps {
  active: SyntraView;
  onNavigate: (view: SyntraView) => void;
  /** Mobile drawer visibility. */
  open: boolean;
  onClose: () => void;
  /** Restore a stored conversation by any of its turn ids (Recent click). */
  onRestoreInvestigation: (id: string) => void;
  /** Thread id of the conversation currently open in the workspace. */
  activeThreadId: string | null;
}

const STORAGE_KEY = "syntra.sidebar.collapsed";

/** How many recent investigation titles to show in the sidebar. */
const RECENT_LIMIT = 12;

/**
 * One row in the Recent list: title + actions menu. Conversations live for
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
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

  const startRename = () => {
    setDraftTitle(item.question);
    setRenaming(true);
  };

  const commitRename = () => {
    const check = validateInvestigationTitle(draftTitle);
    if (!check.valid) {
      toast.error(check.error === "too_long" ? "Title is too long" : "Title is not valid", {
        description:
          check.error === "empty"
            ? "Enter a name for this conversation."
            : "Titles must be 120 characters or fewer with no control characters.",
      });
      return;
    }
    if (!check.valid || check.value === undefined) return;
    if (check.value !== item.question && renameThread(item.threadId, check.value)) {
      toast.success("Conversation renamed");
    }
    setRenaming(false);
  };

  const handleDelete = () => {
    setConfirmingDelete(false);
    if (deleteThread(item.threadId)) {
      toast.success("Conversation deleted");
      // If this conversation is open in the workspace, the Investigate page
      // listens for this and resets itself.
      window.dispatchEvent(
        new CustomEvent("syntra:thread-deleted", { detail: item.threadId }),
      );
    }
  };

  return (
    <div
      className={cn("syn-recent-item group", active && "active", item.archived && "syn-recent-item-archived")}
      data-menu-open={menuOpen ? "true" : undefined}
      data-renaming={renaming ? "true" : undefined}
      aria-current={active ? "true" : undefined}
    >
      {renaming ? (
        <form
          className="flex min-w-0 flex-1 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            commitRename();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setRenaming(false);
          }}
        >
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            maxLength={120}
            aria-label="Conversation name"
            className="w-full rounded-sm border border-primary/50 bg-background px-1.5 py-1 text-xs text-foreground outline-none"
          />
        </form>
      ) : (
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          title={item.question}
          onClick={() => onOpen(item.id)}
        >
          {item.pinned && <Pin className="size-3 shrink-0 fill-current text-primary" />}
          <span className="syn-recent-title">{item.question}</span>
          {item.archived && (
            <span className="syn-mono ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
              Archived
            </span>
          )}
        </button>
      )}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label={`Actions for ${item.question}`}
          >
            <Ellipsis className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="min-w-44">
          <DropdownMenuItem onClick={handleShare}>
            <Share className="size-4" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={startRename}>
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setThreadPinned(item.threadId, !item.pinned);
              toast.success(item.pinned ? "Unpinned" : "Pinned to top");
            }}
          >
            {item.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            {item.pinned ? "Unpin chat" : "Pin chat"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setThreadArchived(item.threadId, !item.archived);
              toast.success(item.archived ? "Conversation unarchived" : "Conversation archived");
            }}
          >
            <Archive className="size-4" />
            {item.archived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {confirmingDelete &&
        createPortal(
          <AlertDialog open onOpenChange={(open) => !open && setConfirmingDelete(false)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the conversation and all of its turns from this
                  session. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>,
          document.body,
        )}
    </div>
  );
}

/** Inner nav used by both the desktop sidebar and the mobile drawer. */
function SidebarContent({
  active,
  onNavigate,
  collapsed,
  onToggleCollapse,
  onNavigateAway,
  onRestoreInvestigation,
  activeThreadId,
}: {
  active: SyntraView;
  onNavigate: (view: SyntraView) => void;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigateAway: () => void;
  onRestoreInvestigation: (id: string) => void;
  activeThreadId: string | null;
}) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  /** Display identity for the session flyout (local sessions are guest-only). */
  const userName = "Guest analyst";
  const avatarInitials = "GA";
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

      {/* Account — Windows 11-style flyout: the Session row opens an account
          menu with the identity header, workspace actions and Log out. */}
      <div className="flex flex-col gap-1 px-2.5 pb-4">
        <hr className="syn-nav-divider mt-0 mb-1" />
        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger className="syn-session-trigger" title="Session menu">
              <CircleUserRound className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">Session</span>
              <ChevronRight className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="end"
              sideOffset={10}
              className="syn-session-menu"
              role="menu"
            >
              {/* Identity header */}
              <div className="syn-session-menu-header" role="presentation">
                <span className="syn-session-avatar" aria-hidden="true">
                  {avatarInitials}
                </span>
                <span className="min-w-0">
                  <span className="syn-session-menu-header-name">{userName}</span>
                  <span className="syn-session-menu-header-meta">Session · Local workspace</span>
                </span>
                <ChevronRight className="syn-session-menu-header-chevron size-4" aria-hidden="true" />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  onNavigate("about");
                  onNavigateAway();
                }}
              >
                <Sparkles className="size-4 shrink-0" aria-hidden="true" />
                <span>About SYNTRA</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  onNavigate("about");
                  onNavigateAway();
                }}
              >
                <LifeBuoy className="size-4 shrink-0" aria-hidden="true" />
                <span>Help &amp; principles</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings className="size-4 shrink-0" aria-hidden="true" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => void handleSignOut()}>
                <LogOut className="size-4 shrink-0" aria-hidden="true" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

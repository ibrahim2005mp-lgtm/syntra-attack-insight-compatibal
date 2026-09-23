import { Suspense, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Sidebar, type SyntraView } from "@/components/Sidebar";
import Investigate from "@/pages/Investigate";
import HistoryPage from "@/pages/History";
import About from "@/pages/About";
import { useApiStatus } from "@/hooks/useApiStatus";
import { isFakeApiEnabled, setFakeApiEnabled } from "@/services/apiMode";

const VIEW_ROUTES: Record<SyntraView, string> = {
  investigate: "/investigate",
  history: "/history",
  about: "/about",
};

function ViewLoading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="syn-card syn-sweep h-16 w-64" aria-busy="true" />
    </div>
  );
}

/**
 * SYNTRA workspace shell. Owns the persistent sidebar, the mobile drawer and
 * API status; routed views render their own header + content. Navigation and
 * history-restore are coordinated through typed custom events so pages stay
 * decoupled from routing internals.
 */
export function SyntraApp({ view }: { view: SyntraView }) {
  const navigate = useNavigate();
  const location = useLocation();
  const apiOnline = useApiStatus();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fakeApi, setFakeApi] = useState(() => isFakeApiEnabled());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const handleToggleFakeApi = useCallback((enabled: boolean) => {
    setFakeApiEnabled(enabled);
    setFakeApi(enabled);
    toast(enabled ? "Fake API enabled" : "Live backend enabled", {
      description: enabled
        ? "Investigations are served in-browser with simulated latency. Type “fail” in a question to test the error state."
        : "Investigations are sent to the configured backend again.",
    });
  }, []);

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const next = (event as CustomEvent<SyntraView>).detail;
      if (next in VIEW_ROUTES) navigate(VIEW_ROUTES[next]);
    };
    const onRestore = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      // Nonce lets the same conversation be re-selected and reloaded.
      navigate("/investigate", {
        state: { restoreId: id, restoreNonce: Date.now() },
      });
    };
    const onOpenNav = () => setDrawerOpen(true);
    const onActiveThread = (event: Event) => {
      setActiveThreadId((event as CustomEvent<string | null>).detail ?? null);
    };
    window.addEventListener("syntra:navigate", onNavigate);
    window.addEventListener("syntra:restore", onRestore);
    window.addEventListener("syntra:open-nav", onOpenNav);
    window.addEventListener("syntra:active-thread", onActiveThread);
    return () => {
      window.removeEventListener("syntra:navigate", onNavigate);
      window.removeEventListener("syntra:restore", onRestore);
      window.removeEventListener("syntra:open-nav", onOpenNav);
      window.removeEventListener("syntra:active-thread", onActiveThread);
    };
  }, [navigate]);

  const handleNavigate = useCallback(
    (next: SyntraView) => {
      setDrawerOpen(false);
      navigate(VIEW_ROUTES[next]);
    },
    [navigate],
  );

  return (
    <div className="syn-app">
      <Sidebar
        active={view}
        onNavigate={handleNavigate}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        fakeApi={fakeApi}
        onToggleFakeApi={handleToggleFakeApi}
        apiOnline={apiOnline}
        onRestoreInvestigation={(id) =>
          window.dispatchEvent(new CustomEvent("syntra:restore", { detail: id }))
        }
        activeThreadId={activeThreadId}
      />
      {/* min-h-0 + overflow-hidden clamp this column to the shell height so
          taller content scrolls inside WorkspacePage instead of stretching
          the app beyond the viewport (page-level scrollbar + dead space). */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Suspense fallback={<ViewLoading />}>
          {view === "investigate" && <Investigate key="investigate" locationState={location.state} />}
          {view === "history" && <HistoryPage key="history" />}
          {view === "about" && <About key="about" />}
        </Suspense>
      </div>
    </div>
  );
}

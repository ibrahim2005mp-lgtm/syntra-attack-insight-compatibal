/**
 * Custom backend — optional integration point.
 *
 * To connect SYNTRA to a proprietary or SDK-based backend (WebSocket, gRPC,
 * a vendor client, an edge worker, …):
 *
 *   1. Implement `BackendAdapter` from ./types (all 9 methods).
 *   2. Register it here or anywhere at startup:
 *        import { registerBackend } from "@/backend";
 *        registerBackend("my-backend", createMyBackend);
 *   3. Select it with VITE_BACKEND_ID=my-backend.
 *
 * The registry validates unknown ids at startup and falls back to the demo
 * backend with a console warning, so a misconfigured id never breaks the app.
 *
 * Keep raw payloads out of the UI: `services/api.ts` will still run every
 * response through the sanitizers, but your adapter should return shapes
 * matching src/types/investigation.ts as closely as possible.
 */
export {};

/**
 * SYNTRA API client — the single HTTP surface of the frontend.
 *
 * Every network access goes through this module: request serialization,
 * timeout/abort behavior, response validation and error normalization live
 * here, never in visual components. The base URL comes from the build-time
 * `VITE_API_BASE_URL` env var (no secrets are read or sent — the browser
 * only ever talks to a versioned, purpose-built endpoint).
 */
import { API_VERSION, type ApiErrorCode, type EntityDetailResponse, type HealthResponse, type LabCatalogResponse, type QueryRequestBody, type QueryResponseBody } from "./contract";

/** Normalized transport failure — mapped to UI states by the adapter. */
export class ApiRequestError extends Error {
  readonly code: ApiErrorCode;
  /** True when retrying the same request may succeed. */
  readonly retryable: boolean;

  constructor(code: ApiErrorCode, message: string, retryable: boolean) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.retryable = retryable;
  }
}

/** Base URL, e.g. "https://api.example.com" — no trailing slash. */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

/** True when a backend is configured and requests go over the network. */
export function isRemoteApiConfigured(): boolean {
  return BASE_URL.length > 0;
}

/** Default request budget; retrieval is expected to be quick. */
const DEFAULT_TIMEOUT_MS = 20_000;

interface RequestOptions {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  /** Override the default timeout for specific calls. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Normalized API-side failure payload (loose — the wire is untrusted). */
interface ApiErrorPayload {
  code?: unknown;
  message?: unknown;
  request_id?: unknown;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Coerce any thrown value into a normalized ApiRequestError. */
function normalizeError(error: unknown, timeoutMs: number): ApiRequestError {
  if (error instanceof ApiRequestError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiRequestError("dependency_unavailable", "The request timed out before the backend responded.", true);
  }
  // Local abort (user cancel) propagates untouched for caller handling.
  if (error instanceof DOMException && error.name === "LocalAbort") throw error;
  if (import.meta.env.DEV) {
    console.warn(`[api] request failed after ${timeoutMs}ms:`, error);
  }
  return new ApiRequestError("internal_error", "The request could not be completed.", true);
}

/**
 * Core request helper. Validates HTTP status, parses and shape-checks the
 * JSON envelope, and normalizes every failure into ApiRequestError with an
 * explicit code — the report's "no overload of results: []" rule applied to
 * transport.
 */
async function request<T>(opts: RequestOptions): Promise<T> {
  if (!isRemoteApiConfigured()) {
    // Guard: nothing should call the transport without a configured API.
    throw new ApiRequestError("dependency_unavailable", "No backend API is configured.", false);
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const composed = opts.signal
    ? AbortSignal.any([opts.signal, timeoutSignal])
    : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/${API_VERSION}${opts.path}`, {
      method: opts.method,
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: composed,
      credentials: "omit",
      mode: "cors",
    });
  } catch (error) {
    throw normalizeError(error, timeoutMs);
  }

  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try {
      const parsed: unknown = await response.json();
      if (isApiErrorPayload(parsed)) payload = parsed;
    } catch {
      // Non-JSON error body — fall back to status-derived codes below.
    }
    const serverCode = typeof payload.code === "string" ? payload.code : undefined;
    const message = typeof payload.message === "string" && payload.message.length > 0 ? payload.message : undefined;
    // A recognized server code wins over the status-derived mapping so the
    // API's explicit error semantics are preserved end-to-end.
    const recognized: ApiErrorCode[] = [
      "invalid_input",
      "rate_limited",
      "dependency_unavailable",
      "not_found",
      "internal_error",
    ];
    if (serverCode !== undefined && recognized.includes(serverCode as ApiErrorCode)) {
      const code = serverCode as ApiErrorCode;
      throw new ApiRequestError(code, message ?? "The backend reported an error.", code !== "invalid_input" && code !== "not_found");
    }
    switch (response.status) {
      case 400:
      case 422:
        throw new ApiRequestError("invalid_input", message ?? "The request was rejected by the backend.", false);
      case 404:
        throw new ApiRequestError("not_found", message ?? "The requested record was not found.", false);
      case 429:
        throw new ApiRequestError("rate_limited", message ?? "Too many requests — please wait a moment and try again.", true);
      case 503:
        throw new ApiRequestError("dependency_unavailable", message ?? "The retrieval backend is temporarily unavailable.", true);
      default:
        throw new ApiRequestError("internal_error", message ?? "The backend reported an unexpected error.", response.status >= 500);
    }
  }

  // Success envelope must be an object; anything else is a contract breach.
  const data: unknown = await response.json().catch(() => {
    throw new ApiRequestError("internal_error", "The backend returned a malformed response.", true);
  });
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new ApiRequestError("internal_error", "The backend returned a malformed response.", true);
  }
  return data as T;
}

/** Service readiness — availability reported per dependency. */
export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>({ method: "GET", path: "/health", signal });
}

/** Submit a natural-language investigation query. */
export function submitQuery(body: QueryRequestBody, signal?: AbortSignal): Promise<QueryResponseBody> {
  return request<QueryResponseBody>({ method: "POST", path: "/query", body, signal });
}

/** Entity detail with resolved provenance and supported relationships. */
export function fetchEntityDetail(entityId: string, signal?: AbortSignal): Promise<EntityDetailResponse> {
  // Ids come from server responses, but the path segment is still encoded.
  return request<EntityDetailResponse>({ method: "GET", path: `/entities/${encodeURIComponent(entityId)}`, signal });
}

/** Future lab catalog — availability metadata only, never a launch action. */
export function fetchLabCatalog(signal?: AbortSignal): Promise<LabCatalogResponse> {
  return request<LabCatalogResponse>({ method: "GET", path: "/labs", signal });
}

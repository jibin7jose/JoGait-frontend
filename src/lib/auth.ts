export type JoGaitUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type AuthResponse = {
  message: string;
  token: string;
  user: JoGaitUser;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

const SESSION_KEY = "jogait_session";

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = LoginPayload & {
  name: string;
  role: string;
  setupCode: string;
};

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

async function requestAuth(
  path: "/api/auth/login" | "/api/auth/register",
  payload: LoginPayload | RegisterPayload,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as
    | AuthResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    const message =
      data && "error" in data ? data.error : "Authentication failed";

    throw new Error(message || "Authentication failed");
  }

  return data as AuthResponse;
}

async function requestAuthenticated<T>(
  path: string,
  session: AuthResponse,
  payload?: unknown,
  method: "POST" | "PATCH" = "POST",
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.token}`,
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const data = (await response.json().catch(() => null)) as
    | AuthResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    const message =
      data && "error" in data ? data.error : "Authentication failed";

    throw new Error(message || "Authentication failed");
  }

  return data as AuthResponse;
}

export function login(payload: LoginPayload) {
  return requestAuth("/api/auth/login", payload);
}

export function register(payload: RegisterPayload) {
  return requestAuth("/api/auth/register", payload);
}

export async function changePassword(
  session: AuthResponse,
  payload: ChangePasswordPayload,
) {
  return requestAuthenticated("/api/auth/change-password", session, payload);
}

export async function validateSession(session: AuthResponse) {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  const data = (await response.json().catch(() => null)) as
    | { user?: JoGaitUser; error?: string }
    | null;

  if (!response.ok || !data?.user) {
    clearSession();
    throw new Error(data?.error || "Session expired. Please sign in again.");
  }

  return { ...session, user: data.user };
}

export function saveSession(session: AuthResponse) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(SESSION_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthResponse;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export async function logout(session?: AuthResponse | null) {
  if (!session) {
    clearSession();
    return;
  }

  try {
    await requestAuthenticated("/api/auth/logout", session);
  } catch {
    // Logout should always complete locally, even if the network is down.
  } finally {
    clearSession();
  }
}

import { AuthResponse, clearSession } from "@/lib/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export type Patient = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type SessionMetric = {
  id: string;
  sessionId: string;
  metricType: string;
  value: number;
  unit: string;
  timestamp: string;
};

export type PatientSession = {
  id: string;
  patientId: string;
  planId?: string | null;
  deviceId: string;
  startTime: string;
  endTime: string;
  scoreSummary?: {
    overallScore?: number;
    symmetryIndex?: number;
  } | null;
  flags?: string[];
  notes?: string | null;
  createdAt: string;
  metrics?: SessionMetric[];
};

type ApiErrorBody = {
  error?: string;
};

async function request<T>(path: string, session: AuthResponse): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  const data = (await response.json().catch(() => null)) as
    | T
    | ApiErrorBody
    | null;

  if (response.status === 401) {
    clearSession();
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? data.error
        : "Unable to load dashboard data";

    throw new Error(message || "Unable to load dashboard data");
  }

  return data as T;
}

export async function getPatients(session: AuthResponse) {
  const data = await request<{ patients: Patient[] }>("/api/patients", session);
  return data.patients;
}

export async function getPatientHistory(
  session: AuthResponse,
  patientId: string,
) {
  const data = await request<{ sessions: PatientSession[] }>(
    `/api/patients/${patientId}/history`,
    session,
  );

  return data.sessions;
}

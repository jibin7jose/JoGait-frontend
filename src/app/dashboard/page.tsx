"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  Patient,
  PatientSession,
  createPatient,
  getPatientHistory,
  getPatients,
} from "@/lib/api";
import {
  AuthResponse,
  clearSession,
  getSession,
  saveSession,
  validateSession,
} from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthResponse | null>(() => getSession());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSessions, setPatientSessions] = useState<PatientSession[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [error, setError] = useState("");
  const [patientFormError, setPatientFormError] = useState("");
  const [patientFormMessage, setPatientFormMessage] = useState("");

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      setIsCheckingAuth(false);
      return;
    }

    let isMounted = true;

    validateSession(session)
      .then((validatedSession) => {
        if (!isMounted) {
          return;
        }

        saveSession(validatedSession);
        setSession(validatedSession);
      })
      .catch(() => {
        if (isMounted) {
          router.replace("/login");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!session || isCheckingAuth) {
      return;
    }

    let isMounted = true;
    const activeSession = session;

    async function loadPatients() {
      setIsLoadingPatients(true);
      setError("");

      try {
        const nextPatients = await getPatients(activeSession);

        if (!isMounted) {
          return;
        }

        setPatients(nextPatients);
        setSelectedPatient(nextPatients[0] || null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load patients",
        );
      } finally {
        if (isMounted) {
          setIsLoadingPatients(false);
        }
      }
    }

    loadPatients();

    return () => {
      isMounted = false;
    };
  }, [isCheckingAuth, session]);

  useEffect(() => {
    if (!session || isCheckingAuth || !selectedPatient) {
      return;
    }

    let isMounted = true;
    const activeSession = session;
    const activePatient = selectedPatient;

    async function loadHistory() {
      setIsLoadingHistory(true);

      try {
        const nextSessions = await getPatientHistory(
          activeSession,
          activePatient.id,
        );

        if (isMounted) {
          setPatientSessions(nextSessions);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load patient history",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [isCheckingAuth, selectedPatient, session]);

  function handleSignOut() {
    clearSession();
    router.replace("/login");
  }

  async function handleCreatePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    setIsCreatingPatient(true);
    setPatientFormError("");
    setPatientFormMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    try {
      const patient = await createPatient(session, { name, email, password });

      setPatients((currentPatients) => [patient, ...currentPatients]);
      setSelectedPatient(patient);
      setPatientSessions([]);
      setPatientFormMessage("Patient account created.");
      form.reset();
    } catch (createError) {
      setPatientFormError(
        createError instanceof Error
          ? createError.message
          : "Unable to create patient account",
      );
    } finally {
      setIsCreatingPatient(false);
    }
  }

  if (!session || isCheckingAuth) {
    return <main className="dashboard-page">Loading...</main>;
  }

  const latestSession = patientSessions[0] || null;
  const maxRomTrend = buildMetricTrend(patientSessions, "kneeAngle", "max");
  const repTrend = buildMetricTrend(patientSessions, "repCount", "sum");
  const totalFlags = patientSessions.reduce(
    (sum, patientSession) => sum + (patientSession.flags?.length || 0),
    0,
  );
  const latestSymmetry = latestSession?.scoreSummary?.symmetryIndex;

  return (
    <main className="dashboard-page">
      <header className="topbar">
        <Link href="/" className="brand">
          JoGait
        </Link>
        <button type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      <section className="dashboard-hero">
        <p className="eyebrow">{session.user.role}</p>
        <h1>Hello, {session.user.name}</h1>
        <p className="lede">
          Review patient progress, inspect recent gait sessions, and choose who
          needs follow-up next.
        </p>
      </section>

      <section className="dashboard-workspace" aria-label="Patient dashboard">
        <div className="patient-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Patients</p>
              <h2>Roster</h2>
            </div>
          </div>

          <form className="patient-create-form" onSubmit={handleCreatePatient}>
            <label>
              Name
              <input name="name" type="text" autoComplete="name" required />
            </label>
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Temporary password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            {patientFormError ? (
              <p className="form-error">{patientFormError}</p>
            ) : null}
            {patientFormMessage ? (
              <p className="form-success">{patientFormMessage}</p>
            ) : null}

            <button type="submit" disabled={isCreatingPatient}>
              {isCreatingPatient ? "Creating..." : "Create patient"}
            </button>
          </form>

          {isLoadingPatients ? (
            <p className="empty-state">Loading patients...</p>
          ) : error ? (
            <p className="form-error">{error}</p>
          ) : patients.length === 0 ? (
            <p className="empty-state">
              No patient accounts yet. Create a patient user to populate this
              roster.
            </p>
          ) : (
            <div className="patient-list">
              {patients.map((patient) => (
                <button
                  className={
                    selectedPatient?.id === patient.id
                      ? "patient-row active"
                      : "patient-row"
                  }
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  type="button"
                >
                  <span>
                    <strong>{patient.name}</strong>
                    <small>{patient.email}</small>
                  </span>
                  <time dateTime={patient.createdAt}>
                    {formatDate(patient.createdAt)}
                  </time>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="history-panel">
          <div className="section-heading">
            <p className="eyebrow">History</p>
            <h2>{selectedPatient?.name || "Select a patient"}</h2>
          </div>

          {!selectedPatient ? (
            <p className="empty-state">Choose a patient to view session history.</p>
          ) : isLoadingHistory ? (
            <p className="empty-state">Loading session history...</p>
          ) : patientSessions.length === 0 ? (
            <p className="empty-state">
              No synced gait sessions for this patient yet.
            </p>
          ) : (
            <div className="patient-detail">
              <div className="metric-summary">
                <article>
                  <span>Latest score</span>
                  <strong>
                    {formatScore(latestSession?.scoreSummary?.overallScore)}
                  </strong>
                </article>
                <article>
                  <span>Symmetry</span>
                  <strong>{formatRatio(latestSymmetry)}</strong>
                </article>
                <article>
                  <span>Sessions</span>
                  <strong>{patientSessions.length}</strong>
                </article>
                <article>
                  <span>Flags</span>
                  <strong>{totalFlags}</strong>
                </article>
              </div>

              <div className="chart-grid">
                <TrendCard
                  label="Max knee ROM"
                  points={maxRomTrend}
                  unit="deg"
                />
                <TrendCard label="Rep volume" points={repTrend} unit="reps" />
              </div>

              <div className="session-list">
                {patientSessions.map((patientSession) => (
                  <article className="session-row" key={patientSession.id}>
                    <div>
                      <h3>{formatDate(patientSession.startTime)}</h3>
                      <p>
                        Device {patientSession.deviceId} -{" "}
                        {patientSession.metrics?.length || 0} metrics -{" "}
                        {patientSession.flags?.length
                          ? `${patientSession.flags.length} flags`
                          : "No flags"}
                      </p>
                    </div>
                    <strong>
                      {formatScore(patientSession.scoreSummary?.overallScore)}
                    </strong>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatScore(value?: number) {
  if (typeof value !== "number") {
    return "--";
  }

  return `${Math.round(value)}%`;
}

function formatRatio(value?: number) {
  if (typeof value !== "number") {
    return "--";
  }

  return value.toFixed(2);
}

type TrendPoint = {
  label: string;
  value: number;
};

function buildMetricTrend(
  sessions: PatientSession[],
  metricType: string,
  mode: "max" | "sum",
): TrendPoint[] {
  return sessions
    .slice()
    .reverse()
    .map((patientSession) => {
      const values =
        patientSession.metrics
          ?.filter((metric) => metric.metricType === metricType)
          .map((metric) => metric.value) || [];

      if (values.length === 0) {
        return null;
      }

      const value =
        mode === "max"
          ? Math.max(...values)
          : values.reduce((sum, nextValue) => sum + nextValue, 0);

      return {
        label: formatDate(patientSession.startTime),
        value,
      };
    })
    .filter((point): point is TrendPoint => Boolean(point));
}

function TrendCard({
  label,
  points,
  unit,
}: {
  label: string;
  points: TrendPoint[];
  unit: string;
}) {
  const latestPoint = points.at(-1);

  return (
    <article className="trend-card">
      <div>
        <span>{label}</span>
        <strong>
          {latestPoint ? `${Math.round(latestPoint.value)} ${unit}` : "--"}
        </strong>
      </div>
      {points.length > 1 ? (
        <svg
          aria-label={`${label} trend`}
          className="trend-line"
          preserveAspectRatio="none"
          viewBox="0 0 100 42"
        >
          <polyline points={buildPolyline(points)} />
        </svg>
      ) : (
        <p className="empty-state">Need two sessions for trend.</p>
      )}
    </article>
  );
}

function buildPolyline(points: TrendPoint[]) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xStep = 100 / Math.max(points.length - 1, 1);

  return points
    .map((point, index) => {
      const x = index * xStep;
      const y = 38 - ((point.value - min) / range) * 32;

      return `${x},${y}`;
    })
    .join(" ");
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Patient,
  PatientSession,
  getPatientHistory,
  getPatients,
} from "@/lib/api";
import { AuthResponse, clearSession, getSession } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [session] = useState<AuthResponse | null>(() => getSession());
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSessions, setPatientSessions] = useState<PatientSession[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) {
      router.replace("/login");
    }
  }, [router, session]);

  useEffect(() => {
    if (!session) {
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
  }, [session]);

  useEffect(() => {
    if (!session || !selectedPatient) {
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
  }, [selectedPatient, session]);

  function handleSignOut() {
    clearSession();
    router.replace("/login");
  }

  if (!session) {
    return <main className="dashboard-page">Loading...</main>;
  }

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
            <p className="eyebrow">Patients</p>
            <h2>Roster</h2>
          </div>

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
            <div className="session-list">
              {patientSessions.map((patientSession) => (
                <article className="session-row" key={patientSession.id}>
                  <div>
                    <h3>{formatDate(patientSession.startTime)}</h3>
                    <p>
                      Device {patientSession.deviceId} -{" "}
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthResponse, clearSession, getSession } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthResponse | null>(null);

  useEffect(() => {
    const storedSession = getSession();

    if (!storedSession) {
      router.replace("/login");
      return;
    }

    setSession(storedSession);
  }, [router]);

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
          Your frontend is now connected to the JoGait auth API. The next
          clinical workflow can build from this signed-in dashboard.
        </p>
      </section>

      <section className="dashboard-grid" aria-label="Dashboard sections">
        <article>
          <span>01</span>
          <h2>Patients</h2>
          <p>Review assigned patients and open their gait history.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Sessions</h2>
          <p>Upload, sync, and inspect gait assessment sessions.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Care Plans</h2>
          <p>Track exercise plans and clinical follow-up notes.</p>
        </article>
      </section>
    </main>
  );
}

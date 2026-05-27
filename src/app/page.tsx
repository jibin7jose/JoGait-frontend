import Link from "next/link";

export default function Home() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div>
          <p className="eyebrow">Clinical gait intelligence</p>
          <h1>JoGait</h1>
          <p className="lede">
            A focused workspace for clinicians to manage gait assessments,
            review sessions, and guide patient recovery.
          </p>
          <div className="hero-actions">
            <Link href="/login">Sign in</Link>
            <Link href="/register" className="secondary-link">
              Create account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

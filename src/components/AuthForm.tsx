"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login, register, saveSession } from "@/lib/auth";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    try {
      const session = isRegister
        ? await register({
            name: String(formData.get("name") || ""),
            email,
            password,
            role: String(formData.get("role") || "clinician"),
          })
        : await login({ email, password });

      saveSession(session);
      router.push("/dashboard");
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Unable to complete authentication",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <p className="eyebrow">JoGait</p>
          <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p className="lede">
            {isRegister
              ? "Start a secure workspace for gait assessments, sessions, and patient progress."
              : "Sign in to review gait sessions, patient records, and care plans."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister ? (
            <label>
              Name
              <input name="name" type="text" autoComplete="name" required />
            </label>
          ) : null}

          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={6}
              required
            />
          </label>

          {isRegister ? (
            <label>
              Role
              <select name="role" defaultValue="clinician">
                <option value="clinician">Clinician</option>
                <option value="patient">Patient</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="switch-auth">
          {isRegister ? "Already have an account?" : "Need an account?"}{" "}
          <Link href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create one"}
          </Link>
        </p>
      </section>
    </main>
  );
}

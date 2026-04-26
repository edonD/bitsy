"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function Pricing() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const joinWaitlist = useMutation(api.waitlist.join);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const result = await joinWaitlist({ email: email.trim(), source: "homepage" });
      setAlreadyExists(result.alreadyExists);
      setSubmitted(true);
    } catch {
      // Fallback: still show success (don't block user if Convex is down)
      setSubmitted(true);
    }
  }

  return (
    <section id="pricing">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-3xl">
          <p className="muted-label text-xs">Early access</p>
          <h2 className="mt-4 text-4xl leading-tight text-[var(--ink)]">
            Get the first reports.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
            Join early access for a simple AI visibility report: where you show up,
            who beats you, what to fix, and what changed after you fix it.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr,380px] lg:items-start">
          {/* What you'll get */}
          <div className="paper-card rounded-[0.45rem] p-6 md:p-7">
            <p className="muted-label text-xs mb-4">What&apos;s included</p>
            <ul className="space-y-3">
              {[
                "Check your brand across ChatGPT, Claude, and Gemini",
                "See which competitors get recommended instead",
                "Get a short list of pages and edits to make",
                "Save before and after runs",
                "Review the raw AI answers behind every score",
                "Track progress over time",
                "See why each recommendation was made",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm leading-snug text-[var(--ink-soft)]"
                >
                  <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-[var(--ink)]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Waitlist signup */}
          <div className="paper-panel rounded-[0.45rem] border-2 border-[var(--ink)] p-6 md:p-7">
            {!submitted ? (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-[0.2rem] border border-[color:var(--line)] bg-[var(--ink)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--paper-soft)] mb-4">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--paper-soft)]" />
                  50% off at launch
                </div>
                <h3 className="text-2xl text-[var(--ink)]">Join the waitlist</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Get early access when the first customer reports are ready.
                  Waitlist members get 50% off for the first 6 months.
                </p>
                <form onSubmit={handleSubmit} className="mt-5">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="field-input"
                  />
                  <button
                    type="submit"
                    className="btn-primary mt-3 w-full rounded-full px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.08em]"
                  >
                    Join waitlist
                  </button>
                </form>
                <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  No credit card required &middot; We&apos;ll email you when it&apos;s ready
                </p>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-3xl text-[var(--ink)] mb-2">
                  {alreadyExists ? "You\u2019re already on the list." : "You\u2019re in."}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  We&apos;ll email you at <strong className="text-[var(--ink)]">{email}</strong> when
                  early access opens.{!alreadyExists && " You\u2019re locked in for 50% off."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

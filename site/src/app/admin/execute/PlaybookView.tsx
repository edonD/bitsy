"use client";

import { useState } from "react";
import Link from "next/link";
import type { BlogTemplate, EvidenceItem, Playbook } from "./types";

export function PlaybookView({
  playbook,
  copied,
  onCopy,
  onSave,
  saveState,
}: {
  playbook: Playbook;
  copied: boolean;
  onCopy: () => void;
  onSave: () => void;
  saveState: "idle" | "saving" | "saved";
}) {
  const verifyHref = (() => {
    const params = new URLSearchParams({
      brand: playbook.brand,
      feature: playbook.feature,
    });
    return `/admin/verify?${params.toString()}`;
  })();

  return (
    <>
      <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="muted-label text-xs">Playbook for {playbook.brand}</p>
            <h2 className="mt-2 text-2xl text-[var(--ink)]">
              {playbook.feature.replace(/_/g, " ")}
              {playbook.query ? (
                <span className="text-[var(--muted)] font-normal"> - &quot;{playbook.query}&quot;</span>
              ) : null}
            </h2>
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            <button
              onClick={onSave}
              disabled={saveState === "saving"}
              className="rounded-full bg-[var(--ink)] text-[var(--paper)] px-4 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saveState === "saving" ? "saving..." : saveState === "saved" ? "saved" : "save playbook"}
            </button>
            <Link
              href={verifyHref}
              className="rounded-full border border-[color:var(--line)] px-4 py-1.5 text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--ink)] text-center transition-colors"
            >
              log as change
            </Link>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{playbook.summary}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          <span>
            you: <span className="text-[var(--ink)] font-mono">{playbook.user_value}</span>
          </span>
          <span>
            leader ({playbook.leader_brand ?? "-"}):{" "}
            <span className="text-[var(--ink)] font-mono">{playbook.leader_value}</span>
          </span>
          <span>
            evidence in library:{" "}
            <span className="text-[var(--ink)] font-mono">{playbook.evidence_library_size}</span>
          </span>
        </div>
      </section>

      <Section number="01" title="Content patch">
        <p className="text-sm text-[var(--muted)] mb-3">
          Ready-to-paste paragraph. Under 100 words, one citation, no marketing adjectives.
        </p>
        <div className="rounded-xl border border-[color:var(--line)] bg-white/80 p-4">
          <p className="text-base leading-relaxed text-[var(--ink)]">{playbook.content_patch.text}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{playbook.content_patch.char_count} chars</span>
            <button
              onClick={onCopy}
              className="rounded-full border border-[color:var(--line)] px-3 py-1 font-mono hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
            >
              {copied ? "copied" : "copy"}
            </button>
          </div>
        </div>
        <EvidenceList items={playbook.content_patch.evidence} />
      </Section>

      <Section number="02" title="Channels - where this content lives">
        {playbook.channels.length === 0 ? (
          <p className="text-sm italic text-[var(--muted)]">No channel recommendations for this feature yet.</p>
        ) : (
          <div className="space-y-3">
            {playbook.channels.map((channel) => (
              <div key={`${channel.kind}-${channel.where}`} className="rounded-xl border border-[color:var(--line)] bg-white/70 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-[var(--ink)]">{channel.where}</span>
                  <span className="rounded-full bg-[rgba(0,0,0,0.05)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    {channel.kind}
                  </span>
                </div>
                <EvidenceList items={channel.evidence} compact />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section number="03" title="Amplification - who should cite you">
        {playbook.amplification.length === 0 ? (
          <p className="text-sm italic text-[var(--muted)]">
            No amplification targets found. Run /collect with these peers to populate cited-sources data.
          </p>
        ) : (
          <div className="space-y-3">
            {playbook.amplification.map((target) => (
              <div key={target.domain} className="rounded-xl border border-[color:var(--line)] bg-white/70 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-sm font-semibold text-[var(--ink)]">{target.domain}</span>
                  <span className="text-[11px] text-[var(--muted)]">
                    gap: <span className="text-[var(--ink)] font-mono">{target.gap}</span>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {Object.entries(target.peer_cite_counts).map(([peer, count]) => (
                    <span key={peer} className="rounded-full bg-[rgba(0,0,0,0.04)] px-2 py-0.5 text-[var(--ink-soft)]">
                      {peer}: {count}
                    </span>
                  ))}
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                    {playbook.brand}: {target.target_cite_count}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[var(--ink-soft)]">{target.pitch_angle}</p>
                <EvidenceList items={target.evidence} compact />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section number="04" title="Content pairings - build these so the patch lands">
        {playbook.content_pairing.length === 0 ? (
          <p className="text-sm italic text-[var(--muted)]">No pairing recommendations yet.</p>
        ) : (
          <div className="space-y-3">
            {playbook.content_pairing.map((pairing) => (
              <div key={pairing.what} className="rounded-xl border border-[color:var(--line)] bg-white/70 p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">{pairing.what}</p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{pairing.why}</p>
                <EvidenceList items={pairing.evidence} compact />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section number="05" title="Publish - research-backed blog templates">
        <p className="text-sm text-[var(--muted)] mb-3">
          Alternative path: publish a full post on your blog. Each template is research-backed and ready to outline.
        </p>
        {playbook.blog_templates.length === 0 ? (
          <p className="text-sm italic text-[var(--muted)]">No templates matched this feature yet.</p>
        ) : (
          <div className="space-y-4">
            {playbook.blog_templates.map((template) => (
              <BlogTemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </Section>

      <Section number="06" title="Timing - when to ship and refresh">
        <div className="rounded-xl border border-[color:var(--line)] bg-white/70 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Ship by" value={playbook.timing.ship_by} />
            <Stat label="Refresh every" value={`${playbook.timing.refresh_cadence_days} days`} />
            <Stat label="Window" value="monthly" />
          </div>
          <p className="mt-3 text-sm text-[var(--ink-soft)]">{playbook.timing.rationale}</p>
          <EvidenceList items={playbook.timing.evidence} compact />
        </div>
      </Section>
    </>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-semibold text-[var(--paper)]">
          {number}
        </span>
        <h3 className="text-lg text-[var(--ink)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-base font-mono text-[var(--ink)]">{value}</p>
    </div>
  );
}

function BlogTemplateCard({ template }: { template: BlogTemplate }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-white/80">
      <button onClick={() => setOpen(!open)} className="w-full text-left px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Blog template - {template.id}</p>
            <h4 className="mt-1 text-lg font-semibold text-[var(--ink)] leading-snug">{template.title}</h4>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">effort</p>
            <p className="font-mono text-sm text-[var(--ink)]">~{template.effort_hours}h</p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">{template.target_word_count.toLocaleString()} words</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-[var(--ink-soft)] leading-relaxed">{template.premise}</p>
        <p className="mt-2 text-xs italic text-[var(--muted)]">{template.why_this_works}</p>
      </button>

      {open && (
        <div className="border-t border-[color:var(--line)] px-5 py-4 space-y-3 bg-white/50">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Outline</p>
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80">
            {template.outline.map((row) => (
              <div
                key={`${row.heading}-${row.wordcount}`}
                className="flex items-start justify-between gap-3 border-b border-[color:var(--line)] px-4 py-2.5 text-sm last:border-b-0"
              >
                <div className="flex-1">
                  <p className="text-[var(--ink)]">{row.heading}</p>
                  {row.note && <p className="mt-0.5 text-[11px] italic text-[var(--muted)]">{row.note}</p>}
                </div>
                <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
                  {row.wordcount > 0 ? `${row.wordcount} w` : "-"}
                </span>
              </div>
            ))}
          </div>
          <EvidenceList items={template.evidence} compact />
        </div>
      )}

      {!open && (
        <div className="border-t border-[color:var(--line)] px-5 py-2 flex items-center justify-between text-[11px] text-[var(--muted)]">
          <span>{template.outline.length} sections - research-backed</span>
          <span className="font-mono">expand</span>
        </div>
      )}
    </div>
  );
}

function EvidenceList({ items, compact }: { items: EvidenceItem[]; compact?: boolean }) {
  if (!items || items.length === 0) return null;

  return (
    <div className={`${compact ? "mt-2" : "mt-4"} space-y-1.5`}>
      {items.map((item) => (
        <details key={item.id} className="rounded-lg border border-[color:var(--line)] bg-[rgba(247,243,236,0.5)] px-3 py-2 text-xs">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
            <span className="truncate text-[var(--ink-soft)]">
              <span className="font-semibold text-[var(--ink)]">{item.claim}</span>
              <span className="mx-2 text-[var(--muted)]">-</span>
              <span className="text-[var(--muted)]">{item.venue}</span>
            </span>
            <span className="text-[10px] text-[var(--muted)] font-mono">more</span>
          </summary>
          <div className="mt-2 space-y-1 text-[var(--ink-soft)] leading-relaxed">
            <p>
              <span className="text-[var(--muted)]">Source:</span> {item.paper}
            </p>
            <p>{item.finding}</p>
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline break-all">
                {item.url}
              </a>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

const faq = [
  {
    question: "Who is Bitsy for?",
    answer:
      "Bitsy is built for product marketers, SEO teams, founders, and agencies working on AI visibility.",
  },
  {
    question: "How is this different from SEO rank tracking?",
    answer:
      "SEO tools measure search positions. Bitsy shows how AI tools talk about your product in their answers.",
  },
  {
    question: "Which AI tools are supported?",
    answer: "ChatGPT, Claude, and Gemini.",
  },
  {
    question: "Can I compare competitors?",
    answer: "Yes. Every run can compare your product with the brands buyers also consider.",
  },
  {
    question: "Is this live monitoring?",
    answer: "Not yet. The current product is focused on point-in-time testing and saved runs.",
  },
];

export function Faq() {
  return (
    <section id="faq">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.05fr,0.95fr]">
          <div>
            <p className="muted-label text-xs">FAQ</p>
            <h2 className="mt-4 text-4xl leading-tight text-[var(--ink)]">
              What teams ask first.
            </h2>
          </div>
          <div className="space-y-3">
            {faq.map((item) => (
              <details key={item.question} className="paper-card rounded-[0.35rem] px-5 py-4">
                <summary className="cursor-pointer list-none pr-6 text-lg font-semibold text-[var(--ink)]">
                  {item.question}
                </summary>
                <p className="mt-3 text-base leading-relaxed text-[var(--ink-soft)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

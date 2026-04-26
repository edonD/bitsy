const faq = [
  {
    question: "Who is Bitsy for?",
    answer:
      "Bitsy is for SaaS teams that want to know when AI tools recommend them, when they recommend competitors, and what to fix next.",
  },
  {
    question: "How is this different from SEO rank tracking?",
    answer:
      "SEO tools track Google pages. Bitsy checks AI answers and shows the exact places where your product is missing.",
  },
  {
    question: "Which AI tools are supported?",
    answer: "ChatGPT, Claude, and Gemini.",
  },
  {
    question: "Can I compare competitors?",
    answer: "Yes. Competitor comparison is the point. Bitsy shows who AI recommends instead of you.",
  },
  {
    question: "Does Bitsy prove a fix caused the change?",
    answer: "No. It tracks before and after runs honestly. It helps you see whether visibility moved after a change, but AI answers can shift for other reasons too.",
  },
  {
    question: "Is this automatic monitoring?",
    answer: "The product starts with reports you can rerun. Scheduled monitoring is part of the roadmap.",
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

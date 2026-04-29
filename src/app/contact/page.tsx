// TEMP: payment gateway verification - remove or simplify after approval
export const metadata = {
  title: "Contact Us · GRITZONE",
  description: "Get in touch with the GRITZONE team.",
};

export default function ContactPage() {
  return (
    <div className="min-h-dvh max-w-3xl mx-auto px-4 py-10 text-neutral-300">
      <a href="/" className="text-amber-500 text-sm">← Back</a>
      <h1 className="text-3xl font-black tracking-tight mt-4 mb-2">Contact Us</h1>
      <p className="text-xs text-neutral-500 mb-8">
        We&apos;d love to hear from you. Reach out for support, feedback, partnerships, or refund requests.
      </p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <Section title="Business Owner">
          <p className="text-neutral-200">Abhishek Bagathi</p>
        </Section>

        <Section title="Email">
          <p>
            <a href="mailto:abhishek@gritzone.me" className="text-amber-500 hover:underline">
              abhishek@gritzone.me
            </a>
          </p>
          <p>
            <a href="mailto:abhishek.bagati@gmail.com" className="text-amber-500 hover:underline">
              abhishek.bagati@gmail.com
            </a>
          </p>
        </Section>

        <Section title="Phone">
          <p>
            <a href="tel:+917407461154" className="text-amber-500 hover:underline">
              +91 74074 61154
            </a>
          </p>
          <p>
            <a href="tel:+918919432114" className="text-amber-500 hover:underline">
              +91 89194 32114
            </a>
          </p>
        </Section>

        <Section title="Operating Address">
          <p className="whitespace-pre-line text-neutral-200">
            {`2, 11th Street,
Kartikeyapuram, Madipakkam,
Chennai - 600091,
Tamil Nadu, India`}
          </p>
        </Section>

        <Section title="Support Hours">
          <p>Monday – Saturday, 10:00 AM – 7:00 PM IST</p>
          <p className="text-neutral-500 text-xs mt-1">
            We typically respond to emails within 24–48 hours on business days.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-bold text-white mb-1">{title}</h2>
      <div className="text-neutral-400">{children}</div>
    </div>
  );
}

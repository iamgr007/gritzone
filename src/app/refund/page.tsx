export default function RefundPage() {
  return (
    <div className="min-h-dvh max-w-3xl mx-auto px-4 py-10 text-neutral-300">
      <a href="/" className="text-amber-500 text-sm">← Back</a>
      <h1 className="text-3xl font-black tracking-tight mt-4 mb-2">Refund & Cancellation Policy</h1>
      <p className="text-xs text-neutral-500 mb-8">Last updated: 21 April 2026</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <Section title="Cancellation">
          You can cancel your subscription anytime from <strong>Settings → Subscription</strong>.
          Cancellation stops future charges. You&apos;ll continue to enjoy Pro features until the end of
          your current billing period.
        </Section>

        <Section title="Monthly Plans">
          Monthly plans (Pro ₹199/mo, Pro Max ₹399/mo) are <strong>non-refundable</strong> once charged,
          since the billing period is short. You&apos;ll retain access for the full month.
        </Section>

        <Section title="Annual Plans">
          Annual plans (Pro ₹1,299/yr, Pro Max ₹2,499/yr) come with a <strong>7-day money-back guarantee</strong>.
          Email <a href="mailto:support@gritzone.me" className="text-amber-500">support@gritzone.me</a> within 7 days
          of purchase with your payment ID to request a full refund.
        </Section>

        <Section title="Failed Payments">
          If a renewal fails, we&apos;ll retry 3 times over 5 days. If it still fails, your account
          reverts to Free tier. Your data is preserved.
        </Section>

        <Section title="Refund Processing">
          Approved refunds are credited back to your original payment method within
          <strong> 5-7 business days</strong>.
        </Section>

        <Section title="Not Eligible for Refunds">
          <ul className="list-disc ml-5 mt-1">
            <li>Accounts terminated for violating Terms of Service</li>
            <li>Refund requests after the 7-day window (annual plans)</li>
            <li>Monthly plan payments</li>
            <li>Partial-month/year refunds after you&apos;ve cancelled</li>
          </ul>
        </Section>

        <Section title="Questions?">
          Email <a href="mailto:support@gritzone.me" className="text-amber-500">support@gritzone.me</a> — we typically reply within 24 hours.
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

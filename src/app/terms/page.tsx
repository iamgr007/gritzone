export default function TermsPage() {
  return (
    <div className="min-h-dvh max-w-3xl mx-auto px-4 py-10 text-neutral-300">
      <a href="/" className="text-amber-500 text-sm">← Back</a>
      <h1 className="text-3xl font-black tracking-tight mt-4 mb-2">Terms of Service</h1>
      <p className="text-xs text-neutral-500 mb-8">Last updated: 21 April 2026</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <Section title="1. Acceptance">
          By using GRITZONE, you agree to these terms. If you disagree, please don&apos;t use the service.
        </Section>

        <Section title="2. Not Medical Advice">
          GRITZONE is a fitness tracking tool, NOT a medical service. Macro recommendations, BMI,
          and workout plans are general fitness guidance. Always consult a doctor before starting any
          diet or exercise program, especially if you have health conditions.
        </Section>

        <Section title="3. Account">
          You&apos;re responsible for your account security. Don&apos;t share passwords. Notify us immediately
          at <a href="mailto:support@gritzone.me" className="text-amber-500">support@gritzone.me</a> if your account is compromised.
        </Section>

        <Section title="4. Acceptable Use">
          No illegal content, harassment, spam, or attempts to hack the service. We can suspend accounts
          that violate these rules.
        </Section>

        <Section title="5. User Content">
          You own what you post (workouts, photos, captions). By posting, you grant GRITZONE a license
          to display it within the app. We can remove content that violates our rules.
        </Section>

        <Section title="6. Subscriptions">
          Pro and Pro Max are recurring subscriptions. You&apos;ll be charged monthly or yearly based on your
          plan. Cancel anytime from Settings → Subscription. Cancellation takes effect at the end of the
          current billing period.
        </Section>

        <Section title="7. Pricing Changes">
          We may change prices with 30 days notice. Your current billing cycle remains unaffected.
        </Section>

        <Section title="8. Intellectual Property">
          GRITZONE branding, code, and designs are ours. Don&apos;t copy or resell.
        </Section>

        <Section title="9. Disclaimers">
          Service is provided &quot;as is&quot;. We don&apos;t guarantee 100% uptime. We&apos;re not liable for
          fitness injuries, data loss (though we do our best to prevent both), or third-party outages.
        </Section>

        <Section title="10. Termination">
          We can terminate accounts that violate these terms. You can delete your account anytime.
        </Section>

        <Section title="11. Governing Law">
          These terms are governed by the laws of India. Disputes are subject to jurisdiction of courts in
          Bengaluru, Karnataka.
        </Section>

        <Section title="12. Contact">
          <a href="mailto:support@gritzone.me" className="text-amber-500">support@gritzone.me</a>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-bold text-white mb-1">{title}</h2>
      <p className="text-neutral-400">{children}</p>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh max-w-3xl mx-auto px-4 py-10 text-neutral-300">
      <a href="/" className="text-amber-500 text-sm">← Back</a>
      <h1 className="text-3xl font-black tracking-tight mt-4 mb-2">Privacy Policy</h1>
      <p className="text-xs text-neutral-500 mb-8">Last updated: 21 April 2026</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <Section title="1. Information We Collect">
          We collect information you provide directly: email, name, fitness data (workouts, meals, check-ins, weight),
          profile photo, and quiz responses (goals, diet preferences, allergies). All data is stored on Supabase servers
          located in Mumbai, India.
        </Section>

        <Section title="2. How We Use Your Data">
          Your data powers your personal dashboard, badges, regimes, and meal plans. We never sell your data.
          Aggregated, anonymized stats may be used to improve the product. If you upgrade, your subscription status
          is stored in our database.
        </Section>

        <Section title="3. AI Food Scanner">
          When you use the AI scanner, your photo is sent to Google Gemini API (subject to Google&apos;s Privacy Policy)
          for analysis and then discarded. We do not store the raw image — only the resulting macro data you choose to log.
        </Section>

        <Section title="4. Social Features">
          Posts, comments, and check-ins may be visible to users who follow you. You control visibility in Settings.
          Your email is never shared publicly.
        </Section>

        <Section title="5. Payments">
          Payments are processed by Razorpay. We never see your card details. Razorpay is PCI DSS compliant.
        </Section>

        <Section title="6. Your Rights">
          You can export or delete your data at any time from Settings → Account. Deletion is permanent.
          Contact us at <a href="mailto:support@gritzone.me" className="text-amber-500">support@gritzone.me</a> for any privacy concerns.
        </Section>

        <Section title="7. Cookies">
          We use essential cookies only (for login sessions). No tracking or advertising cookies.
        </Section>

        <Section title="8. Children">
          GRITZONE is not intended for users under 13. If you&apos;re under 18, please use with parental guidance.
        </Section>

        <Section title="9. Changes">
          We may update this policy. Material changes will be notified via in-app banner 14 days in advance.
        </Section>

        <Section title="10. Contact">
          Email: <a href="mailto:support@gritzone.me" className="text-amber-500">support@gritzone.me</a>
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

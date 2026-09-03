import { useEffect } from "react";

export default function Refunds() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Refund Policy | Match by Hilit";
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc]">
      {/* Header */}
      <div className="bg-[#191265] py-16 px-6 text-center">
        <h1 className="text-4xl font-black text-white mb-3">Refund Policy</h1>
        <p className="text-white/60 text-sm">Last updated: June 2026</p>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16 text-[#191265]">
        <div className="prose prose-lg max-w-none space-y-8">

          <section>
            <p className="text-[#444] leading-relaxed text-lg">
              At Match by Hilit, we are committed to your satisfaction. This Refund Policy outlines the terms under which refunds are available for our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">1. Singles Database Membership</h2>
            <p className="text-[#444] leading-relaxed">
              The singles database entry fee grants you 12 months of membership in our curated matchmaking pool.
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-[#444]">
              <li><strong>Within 7 days of purchase:</strong> Full refund available if your profile has not yet been activated and no matches have been proposed to you.</li>
              <li><strong>After 7 days:</strong> No refund is available once your profile has been added to the active database and the matchmaking process has begun.</li>
              <li><strong>Removal from database:</strong> You may request removal of your profile at any time, but this does not entitle you to a refund.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">2. Coaching Sessions</h2>
            <p className="text-[#444] leading-relaxed">
              Individual and package coaching sessions are subject to the following policy:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-[#444]">
              <li><strong>Cancellation 48+ hours before a session:</strong> Full credit toward a future session.</li>
              <li><strong>Cancellation less than 48 hours before a session:</strong> The session is forfeited and no refund or credit is issued.</li>
              <li><strong>Package refunds:</strong> For multi-session packages, unused sessions may be refunded at the per-session rate, minus a 15% administrative fee, within 30 days of purchase.</li>
              <li><strong>No-shows:</strong> Sessions missed without cancellation are forfeited.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">3. Digital Products (Courses and Guides)</h2>
            <p className="text-[#444] leading-relaxed">
              Due to the digital nature of our courses and guides, all sales are final once the product has been accessed or downloaded.
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-[#444]">
              <li><strong>Within 24 hours of purchase, if not accessed:</strong> Full refund available upon request.</li>
              <li><strong>After accessing or downloading:</strong> No refund is available.</li>
            </ul>
            <p className="text-[#444] leading-relaxed mt-3">
              If you experience a technical issue that prevents you from accessing a purchased product, please contact us and we will resolve the issue or provide a full refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">4. How to Request a Refund</h2>
            <p className="text-[#444] leading-relaxed">
              To request a refund, please contact us within the applicable timeframe:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-[#444]">
              <li><strong>Email:</strong> hello@matchbyhilit.com</li>
              <li>Include your full name, email address used for purchase, the product or service purchased, and the reason for your refund request.</li>
            </ul>
            <p className="text-[#444] leading-relaxed mt-3">
              We will review your request and respond within 3 business days. Approved refunds will be processed to your original payment method within 5 to 10 business days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">5. Chargebacks</h2>
            <p className="text-[#444] leading-relaxed">
              We encourage you to contact us directly before initiating a chargeback with your bank or credit card company. Unauthorized chargebacks may result in suspension of your account and access to our services. We are committed to resolving any issues fairly and promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">6. Exceptions</h2>
            <p className="text-[#444] leading-relaxed">
              We reserve the right to make exceptions to this policy on a case-by-case basis at our sole discretion. If you have a unique situation, please reach out to us and we will do our best to find a fair resolution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">7. Contact</h2>
            <p className="text-[#444] leading-relaxed">
              Questions about our refund policy? We are here to help:<br />
              <strong>Email:</strong> hello@matchbyhilit.com<br />
              <strong>Website:</strong> matchbyhilit.com
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-[#191265]/20 text-center">
          <a href="/en" className="text-[#191265] font-semibold hover:underline">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}

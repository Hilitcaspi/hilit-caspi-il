import { useEffect } from "react";

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Terms of Service | Match by Hilit";
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc]">
      {/* Header */}
      <div className="bg-[#191265] py-16 px-6 text-center">
        <h1 className="text-4xl font-black text-white mb-3">Terms of Service</h1>
        <p className="text-white/60 text-sm">Last updated: June 2026</p>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16 text-[#191265]">
        <div className="prose prose-lg max-w-none space-y-8">

          <section>
            <h2 className="text-2xl font-bold mb-3">1. Acceptance of Terms</h2>
            <p className="text-[#444] leading-relaxed">
              By accessing or using the services provided by Match by Hilit ("we," "us," or "our") at matchbyhilit.com, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">2. Description of Services</h2>
            <p className="text-[#444] leading-relaxed">
              Match by Hilit provides professional matchmaking services, including but not limited to:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-[#444]">
              <li>Access to our curated singles database</li>
              <li>Personalized matchmaking consultations via video call (Zoom) or in person</li>
              <li>Relationship coaching sessions</li>
              <li>Digital courses and guides on relationships and dating</li>
              <li>DNA Relationship Profile assessment</li>
            </ul>
            <p className="text-[#444] leading-relaxed mt-3">
              Our matchmaking service operates across the United States. Due to geographic distances, introductions may be facilitated via Zoom video call as the first meeting. Members who are open to Zoom introductions may be matched with compatible singles from other cities or states.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">3. Eligibility</h2>
            <p className="text-[#444] leading-relaxed">
              To use our services, you must be at least 18 years of age, legally single (not currently married), and a resident of the United States. By registering, you confirm that all information you provide is accurate, current, and complete.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">4. Singles Database Membership</h2>
            <p className="text-[#444] leading-relaxed">
              Upon payment of the database entry fee, you will receive a membership in our curated singles database for a period of 12 months. Membership includes:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-[#444]">
              <li>Inclusion of your profile in our matchmaker's active pool</li>
              <li>Consideration for compatible matches based on your profile and preferences</li>
              <li>Notification when a potential match is identified</li>
              <li>Option to accept or decline any proposed introduction</li>
            </ul>
            <p className="text-[#444] leading-relaxed mt-3">
              Membership in the database does not guarantee a specific number of matches or introductions. Match by Hilit reserves the right to remove any member whose conduct violates these terms or who provides false information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">5. User Conduct</h2>
            <p className="text-[#444] leading-relaxed">
              You agree to use our services in good faith and with genuine intent to pursue a meaningful relationship. You agree not to:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-[#444]">
              <li>Provide false, misleading, or inaccurate information in your profile</li>
              <li>Use the service for any commercial purpose or to solicit other members</li>
              <li>Harass, threaten, or intimidate other members</li>
              <li>Share contact information of other members without their consent</li>
              <li>Attempt to circumvent the matchmaking process</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">6. Privacy and Data</h2>
            <p className="text-[#444] leading-relaxed">
              Your privacy is important to us. Please review our <a href="/privacy" className="text-[#191265] underline font-semibold">Privacy Policy</a>, which explains how we collect, use, and protect your personal information. By using our services, you consent to the collection and use of your data as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">7. Payments</h2>
            <p className="text-[#444] leading-relaxed">
              All payments are processed securely through our payment processor. Prices are listed in US Dollars (USD). By completing a purchase, you authorize us to charge the stated amount to your payment method. All transactions are subject to our <a href="/refunds" className="text-[#191265] underline font-semibold">Refund Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">8. Intellectual Property</h2>
            <p className="text-[#444] leading-relaxed">
              All content on matchbyhilit.com, including text, graphics, logos, course materials, and guides, is the property of Match by Hilit and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">9. Disclaimer of Warranties</h2>
            <p className="text-[#444] leading-relaxed">
              Our services are provided "as is" without warranties of any kind. We do not guarantee that you will find a romantic partner through our services. Matchmaking involves inherent uncertainty, and outcomes depend on many factors beyond our control, including your own choices and the choices of other members.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">10. Limitation of Liability</h2>
            <p className="text-[#444] leading-relaxed">
              To the fullest extent permitted by law, Match by Hilit shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services. Our total liability to you for any claim shall not exceed the amount you paid for the specific service giving rise to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">11. Governing Law</h2>
            <p className="text-[#444] leading-relaxed">
              These Terms of Service shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">12. Changes to Terms</h2>
            <p className="text-[#444] leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify registered members of material changes via email. Continued use of our services after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">13. Contact</h2>
            <p className="text-[#444] leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:<br />
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

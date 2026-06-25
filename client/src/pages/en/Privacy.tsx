import { useEffect } from "react";

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Privacy Policy | Match by Hilit";
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc]">
      {/* Header */}
      <div className="bg-[#191265] py-16 px-6 text-center">
        <h1 className="text-4xl font-black text-white mb-3">Privacy Policy</h1>
        <p className="text-white/60 text-sm">Last updated: June 2026</p>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16 text-[#191265]">
        <div className="prose prose-lg max-w-none space-y-8">

          <section>
            <h2 className="text-2xl font-bold mb-3">1. Introduction</h2>
            <p className="text-[#444] leading-relaxed">
              Match by Hilit ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our matchmaking services at matchbyhilit.com. Please read this policy carefully. If you do not agree with its terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">2. Information We Collect</h2>
            <p className="text-[#444] leading-relaxed">We collect the following types of information:</p>

            <h3 className="text-lg font-semibold mt-4 mb-2">Personal Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2 text-[#444]">
              <li>Name, email address, and phone number</li>
              <li>Date of birth and age</li>
              <li>City, state, and location preferences</li>
              <li>Physical characteristics (height, appearance)</li>
              <li>Relationship history and preferences</li>
              <li>Religious background and observance level</li>
              <li>Education and professional background</li>
              <li>Profile photo</li>
              <li>Responses to our DNA Relationship Profile questionnaire</li>
              <li>Payment information (processed securely by our payment provider)</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 mb-2">Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2 text-[#444]">
              <li>IP address and device information</li>
              <li>Browser type and operating system</li>
              <li>Pages visited and time spent on our site</li>
              <li>Referring URLs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">3. How We Use Your Information</h2>
            <p className="text-[#444] leading-relaxed">We use your personal information to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-[#444]">
              <li>Provide and improve our matchmaking services</li>
              <li>Identify compatible matches based on your profile and preferences</li>
              <li>Facilitate introductions between compatible singles</li>
              <li>Send you match proposals and service-related communications</li>
              <li>Process payments and manage your account</li>
              <li>Send educational content, newsletters, and promotional materials (with your consent)</li>
              <li>Comply with legal obligations</li>
              <li>Improve our matching algorithm and service quality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">4. Sharing Your Information</h2>
            <p className="text-[#444] leading-relaxed">
              We do not sell your personal information to third parties. We may share limited information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-[#444]">
              <li><strong>With potential matches:</strong> When both parties consent to an introduction, we share relevant profile information (name, age, city, photo, and a brief description) with the other person.</li>
              <li><strong>Service providers:</strong> We work with trusted third-party providers for payment processing, email delivery, and analytics. These providers are contractually bound to protect your data.</li>
              <li><strong>Legal requirements:</strong> We may disclose information if required by law or to protect our legal rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">5. Data Security</h2>
            <p className="text-[#444] leading-relaxed">
              We implement industry-standard security measures to protect your personal information, including SSL encryption, secure database storage, and access controls. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">6. Your Rights (CCPA)</h2>
            <p className="text-[#444] leading-relaxed">
              If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-[#444]">
              <li><strong>Right to Know:</strong> You may request information about the personal data we have collected about you.</li>
              <li><strong>Right to Delete:</strong> You may request deletion of your personal data, subject to certain exceptions.</li>
              <li><strong>Right to Opt-Out:</strong> You may opt out of the sale of your personal information (we do not sell personal information).</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights.</li>
            </ul>
            <p className="text-[#444] leading-relaxed mt-3">
              To exercise these rights, please contact us at hello@matchbyhilit.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">7. Data Retention</h2>
            <p className="text-[#444] leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide services. If you request deletion of your account, we will remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">8. Cookies</h2>
            <p className="text-[#444] leading-relaxed">
              We use cookies and similar tracking technologies to improve your experience on our site. You can control cookie settings through your browser. Disabling cookies may affect the functionality of certain features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">9. Email Communications</h2>
            <p className="text-[#444] leading-relaxed">
              With your consent, we may send you emails about our services, relationship tips, and promotions. You may unsubscribe from marketing emails at any time by clicking the unsubscribe link in any email or by contacting us directly. Transactional emails related to your account and services cannot be opted out of while your account is active.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">10. Children's Privacy</h2>
            <p className="text-[#444] leading-relaxed">
              Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that we have collected data from a minor, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">11. Changes to This Policy</h2>
            <p className="text-[#444] leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or by posting a notice on our website. Your continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">12. Contact Us</h2>
            <p className="text-[#444] leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:<br />
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

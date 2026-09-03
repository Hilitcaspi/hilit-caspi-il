import { useEffect } from "react";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("Hi Hilit, I just purchased the coaching program and would love to get started!");
const CALENDLY_URL = "https://hilitcaspi.com/single-session";

export default function EnThankYouCoaching() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Welcome to Coaching | Match by Hilit";
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-6">🌟</div>
        <h1 className="text-3xl md:text-4xl font-black text-[#191265] mb-4">
          Your coaching journey starts now!
        </h1>
        <p className="text-[#444] text-lg leading-relaxed mb-8">
          Thank you for trusting me with this important step. I am genuinely excited to work with you.
        </p>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-[#191265] mb-4">Your next step</h2>
          <p className="text-[#555] mb-6">Schedule your first session using the link below. Choose a time that works for you.</p>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-xl hover:bg-[#ffd84a] transition-all"
          >
            Schedule my first session
          </a>
        </div>

        <div className="bg-[#191265]/5 rounded-2xl p-6 mb-8">
          <h3 className="font-bold text-[#191265] mb-3">What to expect</h3>
          <div className="space-y-3 text-left">
            {[
              "A personalized plan tailored to your situation",
              "Practical tools you can use immediately",
              "Honest, warm, and results-focused conversations",
              "Support between sessions via WhatsApp",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-[#ffe27c] font-bold mt-0.5">✓</span>
                <p className="text-[#444] text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#25D366] text-white font-bold px-8 py-3 rounded-full hover:bg-[#1da851] transition-all"
        >
          Message Hilit on WhatsApp
        </a>

        <p className="mt-8 text-[#727272] text-sm">
          <a href="/en" className="hover:underline">Back to home</a>
        </p>
      </div>
    </div>
  );
}

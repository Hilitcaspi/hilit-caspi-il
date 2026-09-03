import { useEffect } from "react";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("Hi Hilit, I just purchased the course and would love your help getting started!");

export default function EnThankYouCourse() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Welcome to the Course | Match by Hilit";
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-6">🎓</div>
        <h1 className="text-3xl md:text-4xl font-black text-[#191265] mb-4">
          Welcome to the course!
        </h1>
        <p className="text-[#444] text-lg leading-relaxed mb-8">
          Your purchase is confirmed. You will receive an email shortly with access details. Check your inbox (and spam folder, just in case).
        </p>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-[#191265] mb-4">Getting started</h2>
          <div className="space-y-4 text-left">
            {[
              { step: "1", text: "Check your email for your access link" },
              { step: "2", text: "Set aside quiet time to go through the first module" },
              { step: "3", text: "Take notes and apply what you learn between sessions" },
              { step: "4", text: "Reach out if you have any questions" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#ffe27c] text-[#191265] font-bold text-sm flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
                <p className="text-[#444] text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#25D366] text-white font-bold px-8 py-3 rounded-full hover:bg-[#1da851] transition-all mb-6"
        >
          Questions? Message Hilit on WhatsApp
        </a>

        <p className="mt-4 text-[#727272] text-sm">
          <a href="/en" className="hover:underline">Back to home</a>
        </p>
      </div>
    </div>
  );
}

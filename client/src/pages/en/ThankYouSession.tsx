import { useEffect } from "react";

const CALENDLY_URL = "https://calendly.com/hilitcaspi/60min";
const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("Hi Hilit, I just booked a single session and would love to schedule it!");

export default function EnThankYouSession() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Session Booked | Match by Hilit";
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-6">💬</div>
        <h1 className="text-3xl md:text-4xl font-black text-[#191265] mb-4">
          Your session is confirmed!
        </h1>
        <p className="text-[#444] text-lg leading-relaxed mb-8">
          Thank you for booking. Now schedule your session at a time that works for you.
        </p>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-[#191265] mb-4">Schedule your session</h2>
          <p className="text-[#555] mb-6">Choose a date and time using the calendar below.</p>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-xl hover:bg-[#ffd84a] transition-all"
          >
            Open scheduling calendar
          </a>
        </div>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#25D366] text-white font-bold px-8 py-3 rounded-full hover:bg-[#1da851] transition-all"
        >
          Questions? Message Hilit on WhatsApp
        </a>

        <p className="mt-8 text-[#727272] text-sm">
          <a href="/en" className="hover:underline">Back to home</a>
        </p>
      </div>
    </div>
  );
}

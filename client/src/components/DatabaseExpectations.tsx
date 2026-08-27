type DatabaseExpectationsProps = {
  variant?: "light" | "dark";
  compact?: boolean;
  showStats?: boolean;
  className?: string;
};

export default function DatabaseExpectations({
  variant = "light",
  compact = false,
  className = "",
}: DatabaseExpectationsProps) {
  const dark = variant === "dark";
  const shell = dark
    ? "bg-white/8 border-white/15 text-white"
    : "bg-[#fffaf0] border-[#ead47e] text-[#191265]";
  const muted = dark ? "text-white/70" : "text-[#5f5b50]";

  return (
    <section className={`rounded-2xl border p-4 md:p-5 text-right ${shell} ${className}`} dir="rtl">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-black ${dark ? "bg-[#ffe27c] text-[#191265]" : "bg-[#191265] text-[#ffe27c]"}`}>
          i
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-sm md:text-base">מה חשוב לדעת לפני שמצטרפים</h3>
          <p className={`text-xs md:text-sm leading-6 mt-1 ${muted}`}>
            התשלום הוא דמי הצטרפות חד־פעמיים למאגר ולתהליך ההתאמה המקצועי. הוא אינו שירות ליווי אישי ואינו התחייבות למספר התאמות או לתדירות קבועה.
          </p>
          {!compact && (
            <p className={`text-xs md:text-sm leading-6 mt-2 ${muted}`}>
              התאמה נשלחת כאשר קיימת התאמה הדדית ורלוונטית לפי הפרופילים, השאלונים והבדיקה האנושית. המטרה שלנו היא להגדיל בהתמדה את מספר ההזדמנויות המתאימות — בלי לשלוח הצעות אקראיות רק כדי לעמוד בכמות.
            </p>
          )}
        </div>
      </div>

    </section>
  );
}

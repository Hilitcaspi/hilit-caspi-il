type Gender = "male" | "female";

type Props = {
  name: string;
  gender: Gender;
  resultLabel: string;
  href?: string | null;
  onContinue: () => void;
};

// Editorial examples, never live members or a computed personal match list.
// The DNA quiz does not collect age preferences; examples deliberately omit ages.
const EXAMPLES = {
  male: [
    { name: "נועה", city: "תל אביב", dna: "העוגן היציב", detail: "הדדיות, יציבות וקרבה", image: "/manus-storage/tv-demo-fictional-noa_729c3436.webp" },
    { name: "מאיה", city: "רמת גן", dna: "הרומנטיקנית העמוקה", detail: "חום, תקשורת וקשר רציני", image: "/manus-storage/tv-demo-fictional-maya_d18c6c36.webp" },
    { name: "תמר", city: "הרצליה", dna: "הרוח החופשית", detail: "סקרנות, מרחב ושמחת חיים", image: "/manus-storage/tv-demo-fictional-tamar_82047198.webp" },
  ],
  female: [
    { name: "אורי", city: "תל אביב", dna: "העוגן היציב", detail: "הדדיות, יציבות וקרבה", image: "" },
    { name: "יואב", city: "רמת גן", dna: "הרומנטיקן העמוק", detail: "חום, תקשורת וקשר רציני", image: "" },
    { name: "איתן", city: "הרצליה", dna: "הרוח החופשית", detail: "סקרנות, מרחב ושמחת חיים", image: "" },
  ],
};

export default function DnaResultProfileCard({ name, gender, resultLabel, href, onContinue }: Props) {
  const firstName = name.trim().split(/\s+/)[0]?.slice(0, 40);
  const people = gender === "male" ? "נשים" : "גברים";
  const buttonClass = "block w-full rounded-2xl bg-[#ffe27c] px-4 py-4 text-center text-lg font-black text-[#191265] shadow-md transition-colors hover:bg-[#ffda49]";
  return (
    <section data-testid="dna-personal-profile-card" className="rounded-3xl border-2 border-[#ffe27c] bg-white p-6 text-center shadow-sm">
      {firstName && <h2 className="mb-3 text-2xl font-black text-[#191265]">{firstName},</h2>}
      <h3 className="mb-5 text-xl font-black leading-relaxed text-[#191265]">ההיכרות הבאה שלך מתחילה בצעד אחד</h3>
      <div className="grid grid-cols-3 gap-2 text-[#191265]">
        {EXAMPLES[gender].map(profile => (
          <figure key={profile.name} className="overflow-hidden rounded-2xl bg-[#f2edf8]">
            {profile.image ? <img src={profile.image} alt={`פרופיל בדיוני לדוגמה: ${profile.name}`} loading="lazy" width={160} height={180} className="aspect-[1/1.15] w-full object-cover" /> : <div aria-label="פרופיל דוגמה ללא תמונה" className="flex aspect-[1/1.15] items-center justify-center bg-[#e6dcf2] text-4xl font-bold">{profile.name.slice(0, 1)}</div>}
            <figcaption className="px-1.5 py-3">
              <strong className="block text-base font-black">{profile.name}</strong>
              <span className="mt-1 block text-[11px]">{profile.city}</span>
              <span className="mt-2 block text-[10px] font-bold">{profile.dna}</span>
              <span className="mt-1 block text-[10px] leading-relaxed">{profile.detail}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-2 text-xs text-[#727272]">תצוגת פרופילים לדוגמה</p>
      <p className="my-5 text-sm leading-7 text-[#191265]/80">תוצאת {resultLabel} שלך היא נקודת פתיחה. במאגר אפשר לבחון היכרות עם {people} {gender === "male" ? "שרוצות" : "שרוצים"} קשר רציני, לפי סגנונות DNA, ערכים, אורח חיים והעדפות. כל הצעה נשלחת לשני הצדדים לאישור.</p>
      {href ? <a href={href} onClick={onContinue} data-testid="dna-profile-card-cta" className={buttonClass}>כן, הילית. אני רוצה להכיר</a> : <button type="button" onClick={onContinue} data-testid="dna-profile-card-cta" className={buttonClass}>כן, הילית. אני רוצה להכיר</button>}
    </section>
  );
}

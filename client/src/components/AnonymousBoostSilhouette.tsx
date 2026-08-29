export default function AnonymousBoostSilhouette({ className = "" }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="צללית אנונימית. התמונה תישלח לשני הצדדים במייל לאחר שליחת Boost"
      className={`relative overflow-hidden rounded-2xl border border-white/45 bg-[radial-gradient(circle_at_50%_18%,rgba(255,226,124,0.45),transparent_28%),linear-gradient(155deg,#70408f_0%,#2c175f_58%,#160b3d_100%)] shadow-md ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_25%,rgba(255,255,255,0.16)_48%,transparent_70%)]" />
      <div className="absolute left-1/2 top-[14%] h-[38%] w-[58%] -translate-x-1/2 rounded-full bg-white/50 shadow-[0_8px_18px_rgba(18,7,48,0.35)]" />
      <svg viewBox="0 0 96 120" aria-hidden="true" className="absolute inset-x-0 bottom-[-4%] mx-auto h-[72%] w-[96%] text-white/50 drop-shadow-[0_8px_14px_rgba(18,7,48,0.45)]">
        <path d="M8 120c1-37 16-59 40-59s39 22 40 59H8Z" fill="currentColor" />
      </svg>
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-l from-[#ffe27c] via-[#fd73bd] to-[#ffe27c] opacity-80" />
    </div>
  );
}

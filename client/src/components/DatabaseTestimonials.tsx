import { trpc } from "@/lib/trpc";
import { DATABASE_APPROVED_TESTIMONIALS } from "@shared/databaseApprovedTestimonials";

/** Website-approved experience quotes only, separate from private match feedback. */
export default function DatabaseTestimonials() {
  const { data: approvedTestimonials = [] } =
    trpc.publicProof.approvedTestimonials.useQuery(undefined, {
      staleTime: 5 * 60 * 1000,
    });
  const testimonials = [
    ...DATABASE_APPROVED_TESTIMONIALS,
    ...(Array.isArray(approvedTestimonials) ? approvedTestimonials : []),
  ];

  return (
    <section
      id="database-testimonials"
      data-testid="database-testimonials"
      className="bg-[#fffdf9] px-6 py-16 md:py-20"
      aria-labelledby="database-testimonials-title"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold text-[#765d70]">
            מילים מאנשים שכבר עשו את הצעד
          </p>
          <h2
            id="database-testimonials-title"
            className="mt-3 text-3xl font-black leading-tight text-[#191265] md:text-4xl"
          >
            לא רק מה שאני אומרת. מה שאנשים מספרים על הדרך שלי.
          </h2>
        </div>
        <div className="mt-10 grid items-start gap-5 md:grid-cols-2">
          {testimonials.map(testimonial => (
            <blockquote
              key={testimonial.id}
              data-testid="database-testimonial-card"
              className="rounded-[1.6rem] border border-[#171519]/10 bg-[#f4eef1] p-6 text-right shadow-[0_14px_36px_rgba(71,49,65,.07)] md:p-7"
            >
              <p className="text-base leading-8 text-[#514451]">
                ״{testimonial.text}״
              </p>
              <footer className="mt-6 border-t border-[#171519]/10 pt-4 text-sm font-bold text-[#191265]">
                {testimonial.displayName.trim().split(/\s+/)[0] || "בעילום שם"}
                {"topic" in testimonial ? (
                  <span className="mt-1 block text-xs font-normal text-[#655866]">
                    {testimonial.topic}
                  </span>
                ) : null}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

import React from "react";
import { Heart, Star } from "lucide-react";

export type ProfileStaffFlags = {
  isCoachingClient?: boolean | null;
  isNotBasic?: boolean | null;
};

export function profileStaffSurface(profile?: ProfileStaffFlags | null, fallback = "bg-white"): string {
  return profile?.isCoachingClient === true
    ? "bg-pink-50 ring-1 ring-inset ring-pink-300"
    : fallback;
}

export default function ProfileStaffMarkers({
  profile,
  compact = false,
}: {
  profile?: ProfileStaffFlags | null;
  compact?: boolean;
}) {
  const coaching = profile?.isCoachingClient === true;
  const specialAttention = profile?.isNotBasic === true;

  if (!coaching && !specialAttention) return null;

  const badgeClass = compact
    ? "gap-1 px-1.5 py-0.5 text-[9px]"
    : "gap-1.5 px-2 py-0.5 text-[10px]";
  const iconClass = compact ? "size-3" : "size-3.5";

  return (
    <span
      className="mt-1 inline-flex flex-wrap items-center gap-1 font-bold"
      data-profile-staff-markers="true"
      aria-label="סימוני צוות לפרופיל"
    >
      {coaching && (
        <span
          className={`inline-flex items-center rounded-full bg-pink-100 text-pink-900 ${badgeClass}`}
          data-profile-coaching="true"
          aria-label="מלווה"
        >
          <Heart className={iconClass} aria-hidden="true" />
          <span>מלווה</span>
        </span>
      )}
      {specialAttention && (
        <span
          className={`inline-flex items-center rounded-full bg-amber-100 text-amber-900 ${badgeClass}`}
          data-profile-special-attention="true"
          aria-label="יחס מיוחד"
        >
          <Star className={iconClass} fill="currentColor" aria-hidden="true" />
          <span>יחס מיוחד</span>
        </span>
      )}
    </span>
  );
}

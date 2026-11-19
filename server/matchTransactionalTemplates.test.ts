import { describe, expect, it, vi } from "vitest";
import {
  buildConsolationEmail,
  buildContactRevealEmail,
  buildMatchProposalEmail,
  buildMatchRejectionAckEmail,
  redactMatchProposalText,
} from "./emailTemplates";

// Pure render tests: no customers, database, provider or outbound messages.
vi.mock("./emailUnsubscribe", () => ({
  buildSignedUnsubscribeUrl: vi.fn(({ singleId }: { singleId?: number }) =>
    `https://example.test/unsubscribe?token=synthetic-signed-${singleId}`),
}));

const proposal = {
  firstName: "נמען סינתטי",
  recipientGender: "male" as const,
  matchFirstName: "שם סינתטי",
  matchGender: "female" as const,
  matchAge: 36,
  matchHeight: 171,
  matchCity: "עיר בדיקה",
  matchEducation: "master",
  matchOccupation: "עיסוק סינתטי",
  matchReligiosity: "traditional",
  matchReligiosityOrigin: "cultural",
  matchShomerShabbat: false,
  matchMaritalStatus: "divorced",
  matchHasKids: true,
  matchNumKids: 2,
  matchWantsKids: "open",
  matchSmokingStatus: "occasionally",
  matchHasPets: true,
  matchPetType: "כלב",
  matchInterests: "טיולים ומוזיקה",
  matchAbout: "תיאור עצמי סינתטי\nעם שורה נוספת",
  matchDnaType: "romantic",
  matchPhotoUrl: "/manus-storage/synthetic-profile/photo.jpg",
  compatibilityScore: 87,
  hilitsNote: "נימוק סינתטי על ערכים משותפים",
  yesUrl: "https://example.test/decision?token=synthetic&response=yes",
  noUrl: "https://example.test/decision?token=synthetic&response=no",
  recipientEmail: "synthetic-recipient@example.test",
  singleId: 90901,
};

const reveal = {
  ...proposal,
  gender: "male" as const,
  matchLastName: "משפחה סינתטית",
  matchPhone: "0501234567",
  matchEmail: "synthetic-match@example.test",
  preDateTip: "להגיע בסקרנות ובהקשבה.",
  dashboardUrl: "https://example.test/my-profile?token=synthetic&tab=matches",
};

const expectedFacts = [
  "גיל", "36", "גובה", "171 ס״מ", "עיר בדיקה", "תואר שני", "עיסוק סינתטי",
  "מסורתית", "מסורת תרבותית ומשפחתית", "שמירת שבת", "מצב משפחתי", "גרושה",
  "יש ילדים (2)", "רצון בילדים", "פתיחות לנושא", "עישון", "לעיתים", "חיות מחמד",
  "כלב", "תחומי עניין", "טיולים ומוזיקה", "תיאור עצמי סינתטי", "עם שורה נוספת",
  "הרומנטיקנית העמוקה",
];

function expectOrder(body: string, parts: string[]) {
  let previous = -1;
  const positions = parts.map(part => {
    const position = body.indexOf(part, previous + 1);
    previous = position;
    return position;
  });
  for (let index = 0; index < parts.length; index++) {
    expect(positions[index], `missing: ${parts[index]}`).toBeGreaterThanOrEqual(0);
    if (index > 0) expect(positions[index], `${parts[index]} must follow ${parts[index - 1]}`).toBeGreaterThan(positions[index - 1]);
  }
}

function visibleHtml(body: string) {
  return body.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
}

describe("transactional match proposal", () => {
  it("exports the same pre-approval sanitizer for the response-page API", () => {
    expect(redactMatchProposalText("אוהבת מוזיקה 050-765-4321 private@example.test")).toBe("אוהבת מוזיקה [פרטי קשר מוסתרים] [פרטי קשר מוסתרים]");
  });
  it("includes all provided safe profile facts in both MIME bodies", () => {
    const email = buildMatchProposalEmail(proposal);
    for (const body of [email.htmlBody, email.textBody]) {
      for (const fact of expectedFacts) expect(body).toContain(fact);
      expect(body).toContain(proposal.hilitsNote);
      expect(body).toContain("87%");
      expect(body).not.toMatch(/\{\{|undefined|null|NaN/);
    }
  });

  it("orders instruction, photo, all facts, self description, reason, DNA, buttons and mutual-consent note", () => {
    const email = buildMatchProposalEmail(proposal);
    for (const body of [email.htmlBody, email.textBody]) {
      expectOrder(body, [
        "כדי להשיב להצעה", "https://hilitcaspi.com/email-images/synthetic-profile/photo.jpg",
        "שם סינתטי", "גיל", "גובה", "עיר בדיקה", "תואר שני", "עיסוק סינתטי",
        "מצב משפחתי", "ילדים", "תיאור עצמי סינתטי", "נימוק סינתטי", "DNA זוגי",
        body === email.htmlBody ? "response=yes" : proposal.yesUrl,
        body === email.htmlBody ? "response=no" : proposal.noUrl,
        "פרטי יצירת הקשר נחשפים רק אחרי אישור הדדי",
      ]);
    }
  });

  it.each([
    ["male", "מאשר התאמה", "לא מאשר התאמה"],
    ["female", "מאשרת התאמה", "לא מאשרת התאמה"],
    ["other", "אישור התאמה", "לא לאשר התאמה"],
  ] as const)("uses whole %s button labels without gender slashes", (recipientGender, yesLabel, noLabel) => {
    const email = buildMatchProposalEmail({ ...proposal, recipientGender });
    expect(email.htmlBody).toContain(`>${yesLabel}</a>`);
    expect(email.htmlBody).toContain(`>${noLabel}</a>`);
    expect(visibleHtml(email.htmlBody)).not.toMatch(/[א-ת]+\/[א-ת]+/);
    expect(email.textBody).toContain(`${yesLabel}: ${proposal.yesUrl}`);
    expect(email.textBody).toContain(`${noLabel}: ${proposal.noUrl}`);
  });

  it("does not infer the candidate gender from the recipient, including same-sex matches", () => {
    const email = buildMatchProposalEmail({ ...proposal, recipientGender: "female", matchGender: "female" });
    expect(email.htmlBody).toContain("הרומנטיקנית העמוקה");
    expect(email.htmlBody).toContain("גרושה");
    expect(email.htmlBody).not.toContain("הרומנטיקן העמוק");
    const unknown = buildMatchProposalEmail({ ...proposal, matchGender: undefined });
    expect(unknown.htmlBody).toContain("רומנטיקה ועומק רגשי");
    expect(unknown.htmlBody).not.toContain("הרומנטיקנית העמוקה");
  });

  it.each([false, true, undefined])("never renders another party's approval value (%s), contact fields or last name", approved => {
    const withPrivateFields = {
      ...proposal, matchPhone: "0507654321", matchEmail: "private-contact@example.test",
      matchLastName: "משפחה סודית", approvedByOther: approved, otherResponse: "yes",
      matchResponse: "אישור סודי של הצד השני",
    };
    const email = buildMatchProposalEmail(withPrivateFields);
    for (const body of [email.subject, email.htmlBody, email.textBody]) {
      expect(body).not.toContain(withPrivateFields.matchPhone);
      expect(body).not.toContain(withPrivateFields.matchEmail);
      expect(body).not.toContain(withPrivateFields.matchLastName);
      expect(body).not.toContain(withPrivateFields.matchResponse);
      expect(body).not.toContain("גם הצד השני מעוניין");
      expect(body).not.toContain("כבר אישר");
    }
  });

  it("redacts phone numbers, emails, URLs, social handles and prior-response statements in free text", () => {
    const email = buildMatchProposalEmail({
      ...proposal,
      matchAbout: "אוהבת מוזיקה. כתבו לי private@example.test או 050-765-4321 או https://wa.me/972507654321 @private_handle",
      matchOccupation: "עיסוק ליצירת קשר 0507654321",
      hilitsNote: "הצד השני כבר אישר את ההצעה. תחומי עניין משותפים. private@example.test",
    });
    for (const body of [email.htmlBody, email.textBody]) {
      expect(body).toContain("אוהבת מוזיקה");
      expect(body).toContain("תחומי עניין משותפים");
      for (const forbidden of ["private@example.test", "050-765-4321", "0507654321", "972507654321", "@private_handle", "כבר אישר"]) {
        expect(body).not.toContain(forbidden);
      }
    }
  });

  it("defaults to algorithmic attribution and requires explicit provenance for a Hilit-written note", () => {
    const ai = buildMatchProposalEmail({ ...proposal, compatibilityScore: 72 });
    for (const body of [ai.htmlBody, ai.textBody]) {
      expect(body).toContain("ניתוח אלגוריתמי");
      expect(body).toContain("מבוסס על נתוני הפרופיל ושאלוני ההתאמה.");
      expect(body).not.toContain("אישרתי את ההצעה באופן אישי");
      expect(body).not.toContain("חשבתי עליה הרבה");
      expect(body).not.toContain("המלצה אישית שלי");
    }
    const personal = buildMatchProposalEmail({ ...proposal, noteSource: "hilit" });
    expect(personal.htmlBody).toContain("למה הילית חושבת שכדאי להכיר");
    expect(personal.htmlBody).toContain("הנימוק נכתב על ידי הילית");
    const boost = buildMatchProposalEmail({ ...proposal, proposalSource: "boost", noteSource: "hilit" });
    expect(boost.htmlBody).not.toContain("הנימוק נכתב על ידי הילית");
  });

  it("omits absent, null and invalid facts without filling unknowns or inventing zero-age/no-kids assertions", () => {
    const email = buildMatchProposalEmail({
      ...proposal, matchAge: 0, matchHeight: null, matchCity: "", matchEducation: null,
      matchOccupation: undefined, matchReligiosity: null, matchReligiosityOrigin: null,
      matchShomerShabbat: null, matchMaritalStatus: null, matchHasKids: null, matchNumKids: null,
      matchWantsKids: null, matchSmokingStatus: null, matchHasPets: null, matchPetType: null,
      matchInterests: null, matchAbout: null, matchDnaType: "unknown", matchPhotoUrl: undefined,
      compatibilityScore: Number.NaN, hilitsNote: "",
    });
    for (const body of [email.htmlBody, email.textBody]) {
      expect(body).not.toMatch(/לא ידוע|undefined|null|NaN|אין ילדים|גיל: 0|תיאור עצמי|DNA זוגי/);
      expect(body).not.toMatch(/(?:^|[^א-ת])גובה(?:$|[^א-ת])/);
      expect(body).not.toContain("ילדים");
    }
  });

  it("includes child intentions even when the current parenting status is unknown", () => {
    const email = buildMatchProposalEmail({ ...proposal, matchHasKids: null, matchNumKids: null, matchWantsKids: "yes" });
    expect(email.htmlBody).toContain("רוצה ילדים");
    expect(email.textBody).toContain("רצון בילדים: רוצה ילדים");
    expect(email.htmlBody).not.toContain("אין ילדים");
  });

  it("escapes HTML content and attributes, rejects active URLs, and preserves safe image proxying", () => {
    const email = buildMatchProposalEmail({
      ...proposal, firstName: '<img src=x onerror="alert(1)">',
      matchFirstName: 'שם <script>alert(2)</script>', matchAbout: '<b>טקסט & "ציטוט"</b>',
      hilitsNote: '<script>alert(3)</script>', matchCity: "<עיר>",
      yesUrl: 'https://example.test/yes?token=" onmouseover="alert(4)',
      noUrl: "javascript:alert(5)", trackingPixelUrl: 'javascript:alert(6)',
    });
    expect(email.htmlBody).not.toContain("<script>");
    expect(email.htmlBody).toContain("&lt;script&gt;");
    expect(email.htmlBody).toContain("&lt;b&gt;טקסט &amp; &quot;ציטוט&quot;&lt;/b&gt;");
    expect(email.htmlBody).not.toMatch(/href="javascript:|src="javascript:|" onmouseover="/);
    expect(email.htmlBody).toContain('href="#"');
    expect(email.htmlBody).toContain("https://hilitcaspi.com/email-images/synthetic-profile/photo.jpg");
    expect(email.htmlBody).toContain("token=&quot;");
  });
});

describe("mutual-approval contact reveal", () => {
  it("repeats all safe profile facts and reveals the supplied full name and contacts in both bodies", () => {
    const email = buildContactRevealEmail(reveal);
    for (const body of [email.htmlBody, email.textBody]) {
      for (const fact of expectedFacts) expect(body).toContain(fact);
      expect(body).toContain("שם סינתטי משפחה סינתטית");
      expect(body).toContain(reveal.matchPhone);
      expect(body).toContain(reveal.matchEmail);
      expect(body).toContain("כדאי ליצור קשר, להתחיל בשיחה");
      expect(body).toContain("לבדוק יחד אם יש התאמה");
      expectOrder(body, ["שם סינתטי", "גיל", "תיאור עצמי סינתטי", "פרטי יצירת קשר", reveal.matchPhone, "כדאי ליצור קשר"]);
    }
    expect(email.htmlBody).toContain('href="tel:0501234567"');
    expect(email.htmlBody).toContain("token=synthetic&amp;tab=matches");
    expect(email.textBody).toContain(reveal.dashboardUrl);
  });

  it("omits empty contacts rather than fabricating missing details", () => {
    const email = buildContactRevealEmail({ ...reveal, matchPhone: "", matchEmail: "", matchLastName: undefined });
    expect(email.htmlBody).not.toContain('href="tel:');
    expect(email.textBody).not.toContain("טלפון:");
    expect(email.textBody).not.toContain("מייל:");
  });

  it("escapes candidate details and the pre-date tip and never treats an unsafe phone as a link", () => {
    const email = buildContactRevealEmail({
      ...reveal, matchLastName: '<img src=x onerror="alert(1)">',
      matchPhone: '0501234567" onclick="alert(2)', matchEmail: "<script>alert(3)</script>",
      preDateTip: '<b>להקשיב & לשאול</b>', dashboardUrl: "javascript:alert(4)",
    });
    expect(email.htmlBody).not.toContain("<script>");
    expect(email.htmlBody).not.toContain("<img src=x");
    expect(email.htmlBody).not.toMatch(/href="tel:|href="javascript:|" onclick="/);
    expect(email.htmlBody).toContain("&lt;b&gt;להקשיב &amp; לשאול&lt;/b&gt;");
  });
});

describe("service-only match updates", () => {
  it("removes upsells, testimonial gifts and marketing footer content while preserving service/preference links and brand", () => {
    const emails = [
      buildMatchProposalEmail(proposal),
      buildContactRevealEmail({ ...reveal, feedbackUrl: "https://example.test/testimonial-gift" }),
      buildMatchRejectionAckEmail(proposal),
      buildConsolationEmail(proposal),
    ];
    for (const email of emails) {
      for (const body of [email.htmlBody, email.textBody]) {
        expect(body).not.toMatch(/קופון|מבצע|לרכישת|מתנה|testim|instagram|facebook|tiktok|single-session|utm_campaign/);
        expect(body).not.toContain("רשימת התפוצה");
      }
      expect(email.htmlBody).toContain("#191265");
      expect(email.htmlBody).toContain("#ffe27c");
      expect(email.htmlBody).toContain("background:#fff");
      expect(email.htmlBody).toContain("https://hilitcaspi.com/my-profile");
      expect(email.htmlBody).toContain("https://wa.me/972552442334");
      expect(email.htmlBody).toContain("synthetic-signed-90901");
      expect(email.htmlBody).toContain("העדפות דיוור");
      expect(email.htmlBody).toContain("זהו עדכון שירות");
    }
  });

  it("acknowledges a rejection without claiming a new match is guaranteed or displaying the other person's identity", () => {
    const email = buildMatchRejectionAckEmail(proposal);
    for (const body of [email.htmlBody, email.textBody]) {
      expect(body).toContain("נרשמה בחירה שלא לאשר");
      expect(body).toContain("לא תתקדם לחשיפת פרטי קשר");
      expect(body).not.toContain(proposal.matchFirstName);
    }
  });

  it("distinguishes expiry without mutual approval from a decline without inventing a reason for silence", () => {
    const expired = buildConsolationEmail({ ...proposal, reason: "expired" });
    const declined = buildConsolationEmail({ ...proposal, reason: "declined" });
    const defaultEmail = buildConsolationEmail(proposal);
    expect(expired.subject).toContain("תוקף");
    expect(expired.subject).toContain(proposal.matchFirstName);
    expect(expired.htmlBody).toContain(`עדכון על ההצעה עם ${proposal.matchFirstName}`);
    expect(expired.textBody).toContain(`עדכון על ההצעה עם ${proposal.matchFirstName}`);
    for (const body of [expired.htmlBody, expired.textBody]) {
      expect(body).toContain("בלי שהתקבל אישור משני הצדדים");
      expect(body).toContain("אין בכך מידע על הסיבה להיעדר המענה");
      expect(body).not.toContain("דחה");
      expect(body).not.toContain("אמר לא");
    }
    expect(defaultEmail).toEqual(declined);
    expect(declined.htmlBody).toContain("ההצעה לא המשיכה להיכרות הדדית");
  });

  it("escapes names in rejection and consolation", () => {
    for (const email of [
      buildMatchRejectionAckEmail({ ...proposal, firstName: "<script>alert(1)</script>" }),
      buildConsolationEmail({ ...proposal, firstName: "<script>alert(1)</script>" }),
    ]) {
      expect(email.htmlBody).not.toContain("<script>");
      expect(email.htmlBody).toContain("&lt;script&gt;");
    }
  });
});

const SITE = "https://hilitcaspi.com";
const PORTRAIT = `${SITE}/manus-storage/hilit-smiling-portrait_cddd0dfc.jpg`;

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function buildLiveZoomTicketEmail(input: { name: string; joinUrl: string; source: string; questionToken: string }) {
  const name = escapeHtml(input.name.trim().split(/\s+/)[0] || "");
  const joinUrl = escapeHtml(input.joinUrl);
  const questionUrl = `${SITE}/live/question#q=${encodeURIComponent(input.questionToken)}`;
  const gift = input.source === "database_live" || input.source === "plus";
  const headline = gift ? "כרטיס המתנה שלך ללייב מוכן" : "הכרטיס שלך ללייב מוכן";
  const subject = `${headline} | סודות ההתאמה המושלמת`;
  const intro = name ? `היי ${name},` : "היי,";
  const textContent = `${intro}\n\n${headline}.\n\nסודות ההתאמה המושלמת עם הילית כספי\nשבת 31.10.2026 בשעה 20:30 לפי שעון ישראל, בשידור חי ב־Zoom.\n\nלכניסה למפגש: ${input.joinUrl}\n\nשמרו את ההודעה: קישור זה נוצר עבור הכרטיס שלכם. אין צורך בהרשמה נוספת ב־Zoom. אם תגיעו כמה דקות לפני תחילת המפגש, תוכלו להמתין עד שאפתח אותו.\n\nיש לכם שאלה על התאמות או על הפרופיל שלכם? שלחו לי אותה ישירות מכאן, בלי להיכנס לאזור האישי: ${questionUrl}\n\nנתראה שם,\nהילית כספי\n${SITE}/live`;
  const htmlContent = `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0eadc;color:#191265;font-family:Rubik,Arial,sans-serif;direction:rtl;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">הכרטיס שלך לסודות ההתאמה המושלמת · שבת 31.10 בשעה 20:30 · Zoom</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f0eadc;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#fffaf1;border-radius:22px;overflow:hidden;">
<tr><td style="background:#191265;padding:26px 30px;color:#ffe27c;text-align:center;font-size:14px;font-weight:700;letter-spacing:1px;">HILIT CASPI <span style="color:#fff">·</span> LIVE</td></tr>
<tr><td style="padding:0;"><img src="${PORTRAIT}" alt="הילית כספי" width="600" style="display:block;width:100%;height:auto;max-height:260px;object-fit:cover;object-position:center 31%;border:0;"></td></tr>
<tr><td style="padding:32px 32px 20px;text-align:right;">
<p style="font-size:16px;line-height:1.8;margin:0 0 8px;">${intro}</p>
<h1 style="font-size:28px;line-height:1.3;margin:0 0 12px;color:#191265;">${headline}</h1>
<p style="font-size:16px;line-height:1.75;margin:0 0 24px;color:#49446a;">אני ממש שמחה שניפגש. הכנתי לנו ערב שבו אפתח את מאחורי הקלעים של ההתאמות, נדבר על פרופילים שבאמת עובדים ונפנה מקום גם לשאלות שלכם.</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #d8c278;border-radius:18px;background:#fff6dd;"><tr><td style="padding:24px;text-align:center;">
<p style="font-size:12px;letter-spacing:2px;font-weight:700;color:#706045;margin:0 0 11px;">הכרטיס שלך · כניסה אחת</p>
<p style="font-size:23px;line-height:1.35;font-weight:800;margin:0 0 14px;color:#191265;">סודות ההתאמה המושלמת</p>
<p style="font-size:15px;line-height:1.7;margin:0;color:#49446a;">שבת, 31.10.2026&nbsp; · &nbsp;20:30 שעון ישראל<br>בשידור חי ב־Zoom</p>
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:26px 0 12px;"><a href="${joinUrl}" style="display:inline-block;background:#191265;border-radius:999px;padding:16px 34px;color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;">לכניסה אישית ללייב</a></td></tr></table>
<p style="font-size:14px;line-height:1.75;color:#68617c;margin:0 0 18px;text-align:center;">כדאי לשמור את המייל. אין צורך להירשם שוב ב־Zoom.<br>אם תגיעו לפני שהתחלנו, תוכלו להמתין עד שאפתח את המפגש.</p>
<p style="font-size:15px;line-height:1.75;color:#49446a;margin:0 0 18px;">יש שאלה שמסקרנת אתכם לקראת הלייב? <a href="${escapeHtml(questionUrl)}" style="color:#191265;font-weight:700;">שלחו לי אותה ישירות מכאן</a>, בלי להיכנס לאזור האישי.</p>
<p style="font-size:15px;line-height:1.7;margin:0;color:#191265;">נתראה שם,<br><strong>הילית</strong></p>
</td></tr>
<tr><td style="background:#191265;padding:20px 28px;color:#e9e4f5;text-align:center;font-size:12px;line-height:1.8;">הילית כספי · המפגש יתקיים אונליין בלבד<br><a href="${SITE}/live" style="color:#ffe27c;">פרטי המפגש באתר</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, htmlContent, textContent };
}

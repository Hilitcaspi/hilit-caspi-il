import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const source=(name:string)=>readFileSync(new URL(name,import.meta.url),"utf8");

describe("Israeli email gender source contracts",()=>{
 it("does not assign a guessed gender in either Meta import path",()=>{
  const index=source('./_core/index.ts');
  expect(index).not.toContain('gender: gender ?? "female"');
  expect(index).not.toContain('phone: phone || undefined, gender: "female"');
  expect(index).toContain('phone: phone || undefined, gender: undefined');
 });
 it("does not overwrite provider gender attributes with missing values",()=>{
  expect(source('./automation.ts')).toContain('...(gender ? { GENDER: gender } : {})');
 });
 it("uses the same canonical recipient evidence for product journeys without guessing",()=>{
  const grow=source('./growWebhook.ts');
  const resolver=grow.slice(grow.indexOf('async function resolveLifecycleGender'),grow.indexOf('async function handleGuide'));
  expect(resolver).toContain('resolveEmailRecipientGender(db, email)');
  expect(resolver).not.toContain('return "female"');
  expect(resolver).not.toContain('return "male"');
  expect(grow.match(/if \(gender\) startJourney/g)).toHaveLength(2);
 });
 it("keeps neutral product-access delivery before optional gendered nurture",()=>{
  const grow=source('./growWebhook.ts');
  const guide=grow.slice(grow.indexOf('async function handleGuide'),grow.indexOf('async function handleCourse'));
  const course=grow.slice(grow.indexOf('async function handleCourse'),grow.indexOf('async function handleCoaching'));
  for(const code of [guide,course])expect(code.indexOf('sendEmail(')).toBeLessThan(code.indexOf('await resolveLifecycleGender'));
  expect(guide).toContain('המדריך שלך מוכן');expect(guide).toContain('${PAID_GUIDE_URL}');
  expect(course).toContain('רכישת הקורס כוללת גם את המדריך');expect(course).toContain('${COURSE_URL}');expect(course).toContain('${GUIDE_URL}');
  expect(course).not.toContain('כמי שרכש');expect(course).not.toContain('אתם תקועים');
 });
 it("does not describe a woman as he in automatic match email notes",()=>{
  const router=source('./routers.ts');
  expect(router).not.toContain('${singleA.firstName} הוא ${dnaA}');
  expect(router).not.toContain('${singleB.firstName} הוא ${dnaB}');
  expect(router.match(/הפרופיל של \$\{singleA.firstName\}: \$\{dnaA\}/g)).toHaveLength(2);
  expect(router.match(/singleA.gender === "female" \? DNA_PROFILES\[singleA.dnaType\]\?\.label_f/g)).toHaveLength(2);
  expect(router).toContain('singleA.gender === "male" ? tipMale : "כדאי להגיע למפגש');
  expect(router).toContain('singleB.gender === "male" ? tipMale : "כדאי להגיע למפגש');
 });
 it("keeps disabled onboarding stages disabled while removing mixed address",()=>{
  const onboarding=source('./database90DayJourney.ts');
  expect(onboarding).not.toContain('את/ה מתאים/ה');
  expect(onboarding).toContain('stageIndex === 2');expect(onboarding).toContain('day_seven_explanation_disabled');
  expect(onboarding).toContain('generic_status_email_disabled');
 });
 it("does not alter the English journey's source selection",()=>{
  expect(source('./automation.ts')).toContain('if (!journeyKey.startsWith("en_"))');
 });
});

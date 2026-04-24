import { ingestDocument } from "./ingest.js";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Creating a dummy knowledge file...");
  const dummyText = `
جامعة التكنولوجيا والعلوم الحديثة (JUST) هي جامعة افتراضية تم تأسيسها في عام 2026.
تتخصص هذه الجامعة في الذكاء الاصطناعي، الأمن السيبراني، وهندسة البرمجيات.
رئيس الجامعة هو الدكتور "أحمد الذكي" والذي فاز بجائزة نوبل في التكنولوجيا.
نظام JUST Social هو منصة تواصل اجتماعي مخصصة لطلاب هذه الجامعة لتبادل المهارات والخبرات (Skill Swap).
يوفر نظام JUST Social ميزات متقدمة مثل المحادثات الفورية، السبورة الذكية (Whiteboard)، ومساعد ذكي مدعوم بتقنيات RAG.
`;

  const tempFilePath = path.resolve(process.cwd(), "dummy_knowledge.txt");
  fs.writeFileSync(tempFilePath, dummyText);

  console.log("Starting ingestion process...");
  await ingestDocument(tempFilePath, { source: "JUST_Wiki.txt" });

  console.log("Ingestion finished successfully!");
  
  // Clean up
  fs.unlinkSync(tempFilePath);
}

main().catch(console.error);

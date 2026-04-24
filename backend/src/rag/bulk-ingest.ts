import * as fs from 'fs';
import * as path from 'path';
import { ingestDocument } from './ingest.js';

// The directory where you will put all your PDFs, TXTs, or MD files
const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), 'knowledge_base');
const PROGRESS_FILE = path.join(process.cwd(), 'ingest_progress.json');

function loadProgress(): string[] {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
}

function saveProgress(progress: string[]) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function processDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    console.log(`[Bulk Ingest] Directory not found: ${dirPath}`);
    console.log(`[Bulk Ingest] Creating directory for you...`);
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`[Bulk Ingest] Directory created! Please put your files in: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  
  if (files.length === 0) {
    console.log(`[Bulk Ingest] The directory is empty: ${dirPath}`);
    console.log(`[Bulk Ingest] Please add your PDF or TXT files and run this script again.`);
    return;
  }

  const processedFiles = loadProgress();
  const filesToProcess = files.filter(f => !processedFiles.includes(f));

  if (filesToProcess.length === 0) {
    console.log(`[Bulk Ingest] All ${files.length} files have already been processed!`);
    return;
  }

  console.log(`[Bulk Ingest] Found ${files.length} total files. ${processedFiles.length} already processed. Starting ingestion for ${filesToProcess.length} files...`);

  let successCount = 0;
  let failCount = 0;

  for (const file of filesToProcess) {
    const filePath = path.join(dirPath, file);
    
    // Skip directories
    if (fs.statSync(filePath).isDirectory()) {
      console.log(`[Bulk Ingest] Skipping directory: ${file}`);
      continue;
    }

    // Only process pdf, txt, and md
    const ext = path.extname(file).toLowerCase();
    if (!['.pdf', '.txt', '.md'].includes(ext)) {
      console.log(`[Bulk Ingest] Skipping unsupported file type: ${file}`);
      continue;
    }

    try {
      console.log(`\n-----------------------------------`);
      console.log(`⏳ Processing: ${file}`);
      await ingestDocument(filePath, { source: file });
      console.log(`✅ Success: ${file}`);
      
      processedFiles.push(file);
      saveProgress(processedFiles);
      
      successCount++;
      
      // Add a delay between files to avoid rate limits (2s)
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`❌ Failed: ${file}`);
      console.error(error.message);
      failCount++;
    }
  }

  console.log(`\n===================================`);
  console.log(`[Bulk Ingest] Finished!`);
  console.log(`Successfully ingested this run: ${successCount} files`);
  console.log(`Failed to ingest this run: ${failCount} files`);
  console.log(`Total processed overall: ${processedFiles.length} files`);
  console.log(`===================================`);
}

// Run the script
processDirectory(KNOWLEDGE_BASE_DIR)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

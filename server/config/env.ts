import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from root .env.local
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

// Also load from .env as fallback
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

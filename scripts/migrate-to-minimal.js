// scripts/migrate-to-minimal.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = path.resolve(
  __dirname,
  "../public/data/packs/everyday-convo-3days.json"
);
const out = path.resolve(
  __dirname,
  "../public/data/packs/everyday-convo-3days.min.json"
);
const backupDir = path.resolve(__dirname, "../public/data/packs/backup");

if (!fs.existsSync(src)) {
  console.error("source not found:", src);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(src, "utf8"));
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(backupDir, "everyday-convo-3days.backup.json"),
  JSON.stringify(raw, null, 2),
  "utf8"
);

const minimal = {
  id: raw.id,
  title: raw.title,
  subtitle: raw.subtitle,
  learningPlan: raw.learningPlan,
  contents: (raw.contents || []).filter(
    (c) => c.type === "vocabulary" || c.type === "sentence"
  ),
};

fs.writeFileSync(out, JSON.stringify(minimal, null, 2), "utf8");
console.log("✅ migrated to minimal:", out);
console.log(
  "backup saved:",
  path.join(backupDir, "everyday-convo-3days.backup.json")
);

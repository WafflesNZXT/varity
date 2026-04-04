const fs = require("fs");
const path = require("path");

const nextDir = path.join(process.cwd(), ".next");

try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("[clean-next] Removed .next cache");
  } else {
    console.log("[clean-next] No .next cache to remove");
  }
} catch (error) {
  console.warn("[clean-next] Failed to remove .next cache:", error);
}

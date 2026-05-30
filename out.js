const fs = require("fs");
const path = require("path");
const replacer = (content) => {
  let c = content;
  c = c.replace(/bg-\[\#080808\]/g, "bg-[#f4f4f5] dark:bg-[#080808]");
  c = c.replace(/bg-\[\#0A0A0A\]/g, "bg-white dark:bg-[#0A0A0A]");
  c = c.replace(/bg-\[\#111\]/g, "bg-gray-100 dark:bg-[#111]");
  c = c.replace(/border-white\/5/g, "border-black/5 dark:border-white/5");
  c = c.replace(/border-white\/10/g, "border-black/10 dark:border-white/10");
  c = c.replace(/border-white\/20/g, "border-black/20 dark:border-white/20");
  c = c.replace(/border-white\/30/g, "border-black/30 dark:border-white/30");
  c = c.replace(/border-white\/40/g, "border-black/40 dark:border-white/40");
  c = c.replace(/text-\[\#E0E0E0\]/g, "text-gray-900 dark:text-[#E0E0E0]");
  c = c.replace(/text-white\/30/g, "text-black/40 dark:text-white/30");
  c = c.replace(/text-white\/40/g, "text-black/50 dark:text-white/40");
  c = c.replace(/text-white\/50/g, "text-black/60 dark:text-white/50");
  c = c.replace(/text-white\/60/g, "text-black/70 dark:text-white/60");
  c = c.replace(/text-white\/80/g, "text-black/80 dark:text-white/80");
  c = c.replace(/text-white(?!\/)/g, "text-black dark:text-white");
  c = c.replace(/hover:bg-white\/5(?!\d)/g, "hover:bg-black/5 dark:hover:bg-white/5");
  c = c.replace(/hover:bg-white\/\[0\.02\]/g, "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]");
  c = c.replace(/hover:text-white(?!\/)/g, "hover:text-black dark:hover:text-white");
  c = c.replace(/hover:border-white\/10/g, "hover:border-black/10 dark:hover:border-white/10");
  c = c.replace(/hover:border-white\/20/g, "hover:border-black/20 dark:hover:border-white/20");
  c = c.replace(/hover:border-white\/30/g, "hover:border-black/30 dark:hover:border-white/30");
  c = c.replace(/hover:border-white\/40/g, "hover:border-black/40 dark:hover:border-white/40");
  c = c.replace(/bg-white\/5(?!\d)/g, "bg-black/5 dark:bg-white/5");
  c = c.replace(/border-white(?!\/)/g, "border-black dark:border-white");
  return c;
};
const walkSync = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkSync(fullPath);
    } else if (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts")) {
      const content = fs.readFileSync(fullPath, "utf8");
      const newContent = replacer(content);
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
      }
    }
  }
};
walkSync("./src");
console.log("Script completed");

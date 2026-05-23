import { rmSync } from "node:fs";

const generatedBuildPaths = ["apps/api/dist", "apps/web/.next", "apps/web/tsconfig.tsbuildinfo"];

for (const path of generatedBuildPaths) {
  rmSync(path, {
    force: true,
    recursive: true,
  });
}

console.log(`[clean:build] removed ${generatedBuildPaths.length} generated build paths`);

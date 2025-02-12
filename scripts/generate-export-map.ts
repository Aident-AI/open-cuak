import { exec } from 'child_process';
import { stripIndents } from 'common-tags';
import * as fs from 'fs';
import * as path from 'path';

function generateExportsForWorkspace(workspaceDir: string): void {
  const srcDir = path.join(workspaceDir, 'src');

  if (!fs.existsSync(srcDir)) {
    // eslint-disable-next-line no-console
    console.info(`⏭️  Skipping workspace [${workspaceDir}] as it does not contain a 'src' directory.`);
    return;
  }

  const indexFilePath = path.join(srcDir, 'export-map.generated.ts');
  const exportStatements = [] as string[];

  function generateExports(dir: string, basePath: string): void {
    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file);
      const relativePath = `.${fullPath.substring(basePath.length)}`;
      if (relativePath.includes('/__tests__/')) return;

      if (fs.lstatSync(fullPath).isDirectory()) {
        generateExports(fullPath, basePath);
      } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !file.endsWith('.d.ts')) {
        if (file === 'route.ts') return; // Skip route.ts files
        if (file === 'export-map.generated.ts') return; // Skip export-map.generated.ts files
        exportStatements.push(`export * from '${relativePath.replace(/\.tsx?$/, '')}';`);
      }
    });
  }

  generateExports(srcDir, srcDir);

  if (exportStatements.length > 0) {
    const content = stripIndents`
    // ====================
    // This file is auto-generated. Do not edit manually.
    // ====================
    `.trim();
    exportStatements.sort();

    fs.writeFileSync(indexFilePath, content + '\n\n' + exportStatements.join('\n') + '\n');
    // eslint-disable-next-line no-console
    console.info(`✅ Export map generated for workspace [${workspaceDir}].`);
  }
}

function processWorkspaces(workspaces: string[]): void {
  const workDir = __dirname + '/../';
  workspaces.forEach((pattern) => {
    const baseDir = path.join(workDir, pattern.split('*')[0]);
    const workspaceDirs = fs.readdirSync(baseDir);

    workspaceDirs.forEach((workspace) => {
      const fullWorkspacePath = path.join(baseDir, workspace);
      if (fs.existsSync(fullWorkspacePath) && fs.lstatSync(fullWorkspacePath).isDirectory()) {
        generateExportsForWorkspace(fullWorkspacePath);
      }
    });
  });

  // use `touch` to trigger `turbo dev` for both `apps/extension` and `apps/web`
  exec(`touch ./apps/extension/package.json`, (error, stdout, stderr) => {
    // eslint-disable-next-line no-console
    if (error) console.error(`Error: ${error.message}`);
    // eslint-disable-next-line no-console
    if (stderr) console.error(`Stderr: ${stderr}`);
  });
}

// Assuming 'packages' field contains the workspace directories
processWorkspaces(['packages/*']);

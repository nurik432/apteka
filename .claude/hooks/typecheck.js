// PostToolUse: typecheck the package that owns the edited .ts/.tsx file.
// Exit 2 with tsc output on stderr so Claude sees and fixes the errors.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let file;
  try { file = JSON.parse(input).tool_input.file_path; } catch { process.exit(0); }
  if (!file || !/\.(ts|tsx)$/.test(file)) process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const rel = path.relative(root, path.resolve(file)).replace(/\\/g, '/');
  const pkg = rel.startsWith('backend/') ? 'backend' : rel.startsWith('frontend/') ? 'frontend' : null;
  if (!pkg) process.exit(0);

  const cwd = path.join(root, pkg);
  const tscJs = path.join(cwd, 'node_modules', 'typescript', 'bin', 'tsc');
  if (!fs.existsSync(tscJs)) process.exit(0); // deps not installed yet

  const r = spawnSync(process.execPath, [tscJs, '--noEmit', '-p', '.'], { cwd, encoding: 'utf8', timeout: 90000 });
  if (r.status !== 0) {
    process.stderr.write(`tsc errors in ${pkg}/:\n${(r.stdout || '') + (r.stderr || '')}`.slice(0, 4000));
    process.exit(2);
  }
});

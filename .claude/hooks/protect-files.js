// PreToolUse: block edits to secrets, lockfiles, user data and generated files.
// Exit 2 blocks the tool call and shows stderr to Claude.
const path = require('path');

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let file;
  try { file = JSON.parse(input).tool_input.file_path; } catch { process.exit(0); }
  if (!file) process.exit(0);

  const p = path.resolve(file).replace(/\\/g, '/');
  const rules = [
    [/\/\.env(\.[^/]*)?$/, 'environment/secrets file'],
    [/\/package-lock\.json$/, 'lockfile (use npm install instead)'],
    [/\/backend\/uploads\//, 'uploaded user data'],
    [/\/database\/[^/]+\.db(-journal)?$/, 'SQLite database'],
    [/\/tsconfig\.tsbuildinfo$/, 'generated build info'],
    [/\/(dist|node_modules)\//, 'generated/vendored directory'],
  ];
  for (const [re, why] of rules) {
    if (re.test(p)) {
      process.stderr.write(`Blocked: ${file} is a ${why}. Ask the user if this edit is really needed.`);
      process.exit(2);
    }
  }
});

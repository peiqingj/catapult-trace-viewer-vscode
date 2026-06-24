const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const npmCommand = process.env.npm_command;

if (process.env.CI || npmCommand === 'install' || npmCommand === 'ci') {
  console.log('Skipping VS Code extension install during dependency installation. Run npm run install to install the VSIX.');
  process.exit(0);
}

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'package.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const vsixPath = path.join(root, `${manifest.name}-${manifest.version}.vsix`);

if (!hasCommand('code')) {
  console.log('VS Code CLI was not found on PATH. Packaged VSIX only; skipping installation.');
  run('npm', ['run', 'package']);
  process.exit(0);
}

run('npm', ['run', 'package']);
run('code', ['--install-extension', vsixPath, '--force']);

function hasCommand(command) {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command;
  const result = spawnSync(executable, ['--version'], {
    stdio: 'ignore',
    shell: false
  });

  return !result.error && result.status === 0;
}

function run(command, args) {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
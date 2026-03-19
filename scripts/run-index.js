const { spawn } = require("node:child_process");

const rawArgs = process.argv.slice(2);
const env = { ...process.env };
const forwardArgs = [];
let parsingEnv = true;

for (const arg of rawArgs) {
  if (parsingEnv && /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(arg)) {
    const equalsIndex = arg.indexOf("=");
    env[arg.slice(0, equalsIndex)] = arg.slice(equalsIndex + 1);
    continue;
  }
  parsingEnv = false;
  forwardArgs.push(arg);
}

const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts", ...forwardArgs], {
  stdio: "inherit",
  env,
});

child.on("error", (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

import { createToolClient } from "../src/clients/factory";
import { runHeartRateMonitor } from "../src/runtime/heart-rate-monitor";

async function main(): Promise<void> {
  const toolClient = createToolClient();
  const report = await runHeartRateMonitor(toolClient);
  console.log(
    `HEART_RATE_MONITOR_OK candidates=${report.summary.recoveryCandidates} attempted=${report.summary.attemptedRecoveries} resumed=${report.summary.successfulRecoveries}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

import assert from "node:assert/strict";
import test from "node:test";
import { startSerialIntervalLoop } from "../src/runtime/serial-interval-loop";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("serial interval loop waits for the current run before scheduling the next one", async () => {
  let concurrentRuns = 0;
  let maxConcurrentRuns = 0;
  let completedRuns = 0;

  const loop = startSerialIntervalLoop({
    intervalMs: 5,
    runOnce: async () => {
      concurrentRuns += 1;
      maxConcurrentRuns = Math.max(maxConcurrentRuns, concurrentRuns);
      await sleep(25);
      completedRuns += 1;
      concurrentRuns -= 1;
    },
  });

  await sleep(90);
  loop.stop();
  await sleep(20);

  assert.equal(maxConcurrentRuns, 1);
  assert(completedRuns >= 2);
  assert(completedRuns <= 3);
});

test("serial interval loop stops scheduling new runs after stop()", async () => {
  let completedRuns = 0;

  const loop = startSerialIntervalLoop({
    intervalMs: 5,
    runOnce: async () => {
      completedRuns += 1;
    },
  });

  await sleep(20);
  loop.stop();
  const completedAtStop = completedRuns;
  await sleep(30);

  assert.equal(completedRuns, completedAtStop);
});

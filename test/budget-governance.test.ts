import assert from "node:assert/strict";
import test from "node:test";
import { computeBudgetSummary } from "../src/runtime/budget-governance";
import type { BudgetPolicyConfig, ProjectStoreSnapshot, SessionStatusSnapshot, SessionSummary, TaskStoreSnapshot } from "../src/types";

test("computeBudgetSummary creates a primary-agent evaluation from budget policy even without task agent budgets", () => {
  const sessions: SessionSummary[] = [
    {
      sessionKey: "agent:main:main",
      label: "Primary session",
      agentId: "main",
      state: "running",
      lastMessageAt: "2026-03-17T00:00:00.000Z",
    },
  ];
  const statuses: SessionStatusSnapshot[] = [
    {
      sessionKey: "agent:main:main",
      model: "gpt-test",
      tokensIn: 100,
      tokensOut: 200,
      cost: 12,
      updatedAt: "2026-03-17T00:00:00.000Z",
    },
  ];
  const tasks: TaskStoreSnapshot = {
    tasks: [],
    agentBudgets: [],
    updatedAt: "2026-03-17T00:00:00.000Z",
  };
  const projects: ProjectStoreSnapshot = {
    projects: [],
    updatedAt: "2026-03-17T00:00:00.000Z",
  };
  const policy: BudgetPolicyConfig = {
    defaults: { warnRatio: 0.8 },
    agent: {
      main: { cost: 100 },
      jarvis: { cost: 100 },
    },
    project: {},
    task: {},
  };

  const summary = computeBudgetSummary(sessions, statuses, tasks, projects, policy);

  assert.equal(summary.evaluations.length, 1);
  assert.equal(summary.evaluations[0]?.scope, "agent");
  assert.equal(summary.evaluations[0]?.scopeId, "main");
  assert.equal(summary.evaluations[0]?.label, "Jarvis");
  assert.equal(summary.evaluations[0]?.thresholds.cost, 100);
  assert.equal(summary.evaluations[0]?.usage.cost, 12);
});

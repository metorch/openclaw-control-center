// @ts-nocheck

function createCollaborationThreadHelpers(deps) {
  const {
    buildSessionDetailHref,
    deriveAgentAnimalIdentity,
    executionChainCardTitle,
    executionChainSourceLabel,
    extractAgentIdFromSessionKey,
    formatTimeAgoFromNow,
    humanizeOperatorLabel,
    looksLikeStructuredExecutionTitle,
    normalizeInlineText,
    normalizeLookupKey,
    pickLatestTimestamp,
    pickUiText,
    safeTruncate,
    summarizeStructuredSessionPayload,
    summarizeVisibleSessionSnippet,
    toSortableMs,
  } = deps;

  function buildCollaborationThreadCards(input) {
    const sessionByKey = new Map(input.sessionItems.map((item) => [item.sessionKey, item]));
    const resolved = input.cards.map((card) => {
      const chain = card.executionChain;
      const parentSessionKey = chain.parentSessionKey ?? card.sessionKey;
      const childSessionKey = chain.childSessionKey;
      const hasChildSession = Boolean(childSessionKey);
      const parentSession = sessionByKey.get(parentSessionKey);
      const childSession = childSessionKey ? sessionByKey.get(childSessionKey) : void 0;
      const ownerAgentId = normalizeAgentIdCandidate(card.agentId ?? card.owner);
      const parentAgentId =
        normalizeAgentIdCandidate(parentSession?.agentId) ??
        normalizeAgentIdCandidate(extractAgentIdFromSessionKey(parentSessionKey ?? "")) ??
        ownerAgentId ??
        "main";
      const childAgentId =
        normalizeAgentIdCandidate(childSession?.agentId) ??
        normalizeAgentIdCandidate(extractAgentIdFromSessionKey(childSessionKey ?? "")) ??
        normalizeAgentIdCandidate(card.agentId) ??
        parentAgentId;
      const routeAgentIds = childSessionKey ? [parentAgentId, childAgentId] : [parentAgentId];
      const status = resolveCollaborationThreadStatus(card);
      const currentOwnerAgentId = resolveCollaborationCurrentOwner(card, parentAgentId, childAgentId);
      const currentOwnerRole = hasChildSession || chain.spawned ? "child" : "parent";
      const latestAt = pickLatestTimestamp([
        childSession?.latestHistoryAt,
        childSession?.lastMessageAt,
        parentSession?.latestHistoryAt,
        parentSession?.lastMessageAt,
        card.latestAt,
        chain.spawnedAt,
        chain.acceptedAt,
      ]);
      const participants = routeAgentIds.map((agentId, index) => ({
        agentId,
        label: humanizeOperatorLabel(agentId),
        identity: deriveAgentAnimalIdentity(agentId),
        current: normalizeLookupKey(agentId) === normalizeLookupKey(currentOwnerAgentId ?? ""),
        roleLabel: collaborationParticipantRoleLabel(index === 0 ? "parent" : "child", input.language),
      }));
      const uniqueParticipantCount = new Set(routeAgentIds.map((agentId) => normalizeLookupKey(agentId))).size;
      const multiAgent = uniqueParticipantCount > 1;
      const primaryDispatched =
        routeAgentIds.length > 1 &&
        normalizeLookupKey(routeAgentIds[0] ?? "") === normalizeLookupKey(input.primaryAgentId);
      const routeTitle = collaborationRouteLabel(parentAgentId, childAgentId, hasChildSession, input.language);
      const taskTitle = deriveCollaborationTaskTitle({
        card,
        parentSession,
        childSession,
        language: input.language,
      });
      const latestSnippetSource =
        childSession?.latestSnippet ?? parentSession?.latestSnippet ?? card.latestSnippet ?? chain.detail;
      const latestSnippet = summarizeVisibleSessionSnippet(latestSnippetSource, input.language, 120);
      const timeline = buildCollaborationTimelineSteps({
        card,
        parentAgentId,
        childAgentId,
        parentSession,
        childSession,
        language: input.language,
      });

      return {
        id: `${card.sessionKey}:${routeAgentIds.join("->")}`,
        kind: "parent_child",
        sessionKey: card.sessionKey,
        taskTitle,
        routeTitle,
        summary: collaborationThreadSummary({
          card,
          status,
          parentAgentId,
          childAgentId,
          language: input.language,
        }),
        status,
        statusBadge: collaborationThreadStatusLabel(status, input.language),
        kindBadge: collaborationThreadKindLabel("parent_child", input.language),
        currentOwnerLabel: collaborationRoleAgentLabel(
          currentOwnerRole,
          currentOwnerAgentId ?? routeAgentIds.at(-1) ?? parentAgentId,
          input.language,
        ),
        currentOwnerAgentId,
        currentOwnerRole,
        latestAt,
        latestAtLabel: latestAt
          ? pickUiText(
              input.language,
              `Updated ${formatTimeAgoFromNow(latestAt, input.language)}`,
              `最近更新 ${formatTimeAgoFromNow(latestAt, input.language)}`,
            )
          : pickUiText(input.language, "No visible update yet", "还没有可见更新"),
        participants,
        routeJoiner: "→",
        multiAgent,
        primaryDispatched,
        aggregateCount: 1,
        aggregateItems: [{ sessionKey: card.sessionKey, sessionHref: card.sessionHref, latestAt }],
        taskHref: card.taskHref,
        sessionHref: card.sessionHref,
        timeline,
        latestSnippet,
        sourceLabel: executionChainSourceLabel(chain, input.language),
        parentSessionKey,
        childSessionKey,
        roomRefs: [],
      };
    });

    const grouped = foldCollaborationThreadCards(resolved, input.language);
    return grouped.sort((a, b) => {
      const statusRank = collaborationStatusRank(b.status) - collaborationStatusRank(a.status);
      if (statusRank !== 0) {
        return statusRank;
      }
      const timeRank = toSortableMs(b.latestAt) - toSortableMs(a.latestAt);
      if (timeRank !== 0) {
        return timeRank;
      }
      return a.routeTitle.localeCompare(b.routeTitle);
    });
  }

  function foldCollaborationThreadCards(cards, language) {
    const passthrough = [];
    const groups = new Map();

    for (const card of cards) {
      const shouldFold = card.status === "completed" && !card.multiAgent;
      if (!shouldFold) {
        passthrough.push(card);
        continue;
      }
      const groupKey = [
        normalizeLookupKey(card.routeTitle),
        normalizeLookupKey(card.taskTitle),
        normalizeLookupKey(card.currentOwnerAgentId ?? ""),
      ].join("::");
      const existing = groups.get(groupKey) ?? [];
      existing.push(card);
      groups.set(groupKey, existing);
    }

    const folded = [];
    for (const group of groups.values()) {
      if (group.length === 1) {
        folded.push(group[0]);
        continue;
      }
      const ordered = [...group].sort((a, b) => toSortableMs(b.latestAt) - toSortableMs(a.latestAt));
      const latest = ordered[0];
      const aggregateItems = ordered.map((item) => ({
        sessionKey: item.sessionKey,
        sessionHref: item.sessionHref,
        latestAt: item.latestAt,
      }));
      const ownerLabel = latest.currentOwnerLabel;
      const countLabel = pickUiText(language, `${group.length} similar runs`, `${group.length} 条相近协作`);
      folded.push({
        ...latest,
        summary: pickUiText(
          language,
          `${ownerLabel} finished ${group.length} similar collaboration runs recently. The latest timeline stays expanded here, and the rest are folded into this card.`,
          `${ownerLabel} 最近完成了 ${group.length} 条相近协作。这里保留最新一条时间线，其余同类线程已折叠到这张卡里。`,
        ),
        latestAtLabel: latest.latestAt
          ? pickUiText(
              language,
              `Updated ${formatTimeAgoFromNow(latest.latestAt, language)} · ${countLabel}`,
              `最近更新 ${formatTimeAgoFromNow(latest.latestAt, language)} · ${countLabel}`,
            )
          : pickUiText(language, `No visible update yet · ${countLabel}`, `还没有可见更新 · ${countLabel}`),
        aggregateCount: group.length,
        aggregateItems,
        sourceLabel: pickUiText(
          language,
          `Showing the latest representative thread. ${group.length} similar completed runs are folded together.`,
          `当前展示最新一条代表线程；另有 ${group.length} 条相近的已完成协作已折叠显示。`,
        ),
      });
    }

    return [...passthrough, ...folded];
  }

  function buildInterSessionCollaborationCards(input) {
    const sessionByKey = new Map(input.sessionItems.map((item) => [item.sessionKey, item]));
    const grouped = new Map();

    for (const targetSession of input.sessionItems) {
      for (const signal of targetSession.interSessionSignals ?? []) {
        const sourceKey = signal.sourceSessionKey.trim();
        const targetKey = targetSession.sessionKey.trim();
        if (!sourceKey || !targetKey || normalizeLookupKey(sourceKey) === normalizeLookupKey(targetKey)) {
          continue;
        }
        const sourceSession = sessionByKey.get(sourceKey);
        const taskSeed = normalizeLookupKey(
          deriveInterSessionTaskTitle({
            signalSnippet: signal.snippet,
            sourceSession,
            targetSession,
            language: input.language,
          }),
        );
        const pairKey = [sourceKey, targetKey].sort().join("::");
        const groupKey = `${pairKey}::${taskSeed || "shared"}`;
        const existing = grouped.get(groupKey) ?? [];
        existing.push({
          sourceSessionKey: sourceKey,
          targetSessionKey: targetKey,
          sourceTool: signal.sourceTool,
          snippet: signal.snippet,
          at: signal.timestamp,
        });
        grouped.set(groupKey, existing);
      }
    }

    const cards = [];
    for (const signals of grouped.values()) {
      const orderedSignals = [...signals].sort((a, b) => toSortableMs(a.at) - toSortableMs(b.at));
      const latest = orderedSignals.at(-1);
      if (!latest) {
        continue;
      }
      const sourceSession = sessionByKey.get(latest.sourceSessionKey);
      const targetSession = sessionByKey.get(latest.targetSessionKey);
      const sourceAgentId =
        normalizeAgentIdCandidate(sourceSession?.agentId) ??
        normalizeAgentIdCandidate(extractAgentIdFromSessionKey(latest.sourceSessionKey)) ??
        "main";
      const targetAgentId =
        normalizeAgentIdCandidate(targetSession?.agentId) ??
        normalizeAgentIdCandidate(extractAgentIdFromSessionKey(latest.targetSessionKey)) ??
        "main";
      const bidirectional = orderedSignals.some(
        (signal) =>
          normalizeLookupKey(signal.sourceSessionKey) === normalizeLookupKey(latest.targetSessionKey) &&
          normalizeLookupKey(signal.targetSessionKey) === normalizeLookupKey(latest.sourceSessionKey),
      );
      const latestAt = pickLatestTimestamp([
        latest.at,
        targetSession?.latestHistoryAt,
        targetSession?.lastMessageAt,
        sourceSession?.latestHistoryAt,
        sourceSession?.lastMessageAt,
      ]);
      const status = resolveInterSessionCollaborationStatus({ sourceSession, targetSession, bidirectional });
      const currentOwnerAgentId = targetAgentId;
      const taskTitle = deriveInterSessionTaskTitle({
        signalSnippet: latest.snippet,
        sourceSession,
        targetSession,
        language: input.language,
      });
      const participants = [
        {
          agentId: sourceAgentId,
          label: humanizeOperatorLabel(sourceAgentId),
          identity: deriveAgentAnimalIdentity(sourceAgentId),
          current: normalizeLookupKey(sourceAgentId) === normalizeLookupKey(currentOwnerAgentId),
          roleLabel: pickUiText(input.language, "Sending session", "发送会话"),
        },
        {
          agentId: targetAgentId,
          label: humanizeOperatorLabel(targetAgentId),
          identity: deriveAgentAnimalIdentity(targetAgentId),
          current: normalizeLookupKey(targetAgentId) === normalizeLookupKey(currentOwnerAgentId),
          roleLabel: pickUiText(input.language, "Receiving session", "接收会话"),
        },
      ];

      cards.push({
        id: `inter-session:${latest.sourceSessionKey}->${latest.targetSessionKey}:${normalizeLookupKey(taskTitle)}`,
        kind: "inter_session",
        sessionKey: latest.targetSessionKey,
        taskTitle,
        routeTitle: collaborationInterSessionRouteLabel(sourceAgentId, targetAgentId, input.language),
        summary: collaborationInterSessionSummary({
          status,
          sourceAgentId,
          targetAgentId,
          bidirectional,
          language: input.language,
        }),
        status,
        statusBadge: collaborationThreadStatusLabel(status, input.language),
        kindBadge: collaborationThreadKindLabel("inter_session", input.language),
        currentOwnerLabel: collaborationInterSessionCurrentOwnerLabel(targetAgentId, input.language),
        currentOwnerAgentId,
        currentOwnerRole: "target",
        latestAt,
        latestAtLabel: latestAt
          ? pickUiText(
              input.language,
              `Updated ${formatTimeAgoFromNow(latestAt, input.language)}`,
              `最近更新 ${formatTimeAgoFromNow(latestAt, input.language)}`,
            )
          : pickUiText(input.language, "No visible update yet", "还没有可见更新"),
        participants,
        routeJoiner: "⇄",
        multiAgent: normalizeLookupKey(sourceAgentId) !== normalizeLookupKey(targetAgentId),
        primaryDispatched: normalizeLookupKey(sourceAgentId) === normalizeLookupKey(input.primaryAgentId),
        aggregateCount: 1,
        aggregateItems: [
          {
            sessionKey: latest.targetSessionKey,
            sessionHref: buildSessionDetailHref(latest.targetSessionKey, input.language),
            latestAt,
          },
        ],
        taskHref: void 0,
        sessionHref: buildSessionDetailHref(latest.targetSessionKey, input.language),
        timeline: buildInterSessionCollaborationTimelineSteps({
          sourceAgentId,
          targetAgentId,
          sourceSession,
          targetSession,
          signals: orderedSignals,
          language: input.language,
        }),
        latestSnippet: summarizeVisibleSessionSnippet(latest.snippet, input.language, 140),
        sourceLabel: pickUiText(
          input.language,
          `Verified via inter-session message (${latest.sourceTool ?? "inter-session"}).`,
          `已通过跨会话消息验证（${latest.sourceTool ?? "inter-session"}）。`,
        ),
        parentSessionKey: latest.sourceSessionKey,
        childSessionKey: latest.targetSessionKey,
        roomRefs: [],
      });
    }

    return cards;
  }

  function mergeCollaborationThreadCards(primary, secondary) {
    const combined = [...primary, ...secondary];
    return combined.sort((a, b) => {
      const statusRank = collaborationStatusRank(b.status) - collaborationStatusRank(a.status);
      if (statusRank !== 0) {
        return statusRank;
      }
      const timeRank = toSortableMs(b.latestAt) - toSortableMs(a.latestAt);
      if (timeRank !== 0) {
        return timeRank;
      }
      if (a.kind !== b.kind) {
        return a.kind === "inter_session" ? -1 : 1;
      }
      return a.routeTitle.localeCompare(b.routeTitle);
    });
  }

  function collaborationThreadKindLabel(kind, language = "zh") {
    if (kind === "inter_session") {
      return pickUiText(language, "Cross-session communication", "跨会话通信");
    }
    return pickUiText(language, "Parent-child relay", "父子协作");
  }

  function deriveInterSessionTaskTitle(input) {
    const candidates = [
      input.sourceSession?.taskSnippet,
      input.targetSession?.taskSnippet,
      input.sourceSession?.label,
      input.targetSession?.label,
      input.signalSnippet,
      input.sourceSession?.latestSnippet,
      input.targetSession?.latestSnippet,
    ];
    for (const candidate of candidates) {
      const derived = extractCollaborationTaskLabel(candidate ?? "", input.language);
      if (derived?.trim()) {
        return derived;
      }
    }
    return pickUiText(input.language, "Cross-session communication", "跨会话沟通");
  }

  function resolveInterSessionCollaborationStatus(input) {
    const states = [input.sourceSession?.state, input.targetSession?.state];
    if (states.some((state) => state === "blocked" || state === "error" || state === "waiting_approval")) {
      return "blocked";
    }
    if (states.some((state) => state === "running")) {
      return "active";
    }
    if (!input.bidirectional) {
      return "handoff";
    }
    const latestAt = pickLatestTimestamp([
      input.sourceSession?.latestHistoryAt,
      input.sourceSession?.lastMessageAt,
      input.targetSession?.latestHistoryAt,
      input.targetSession?.lastMessageAt,
    ]);
    const latestMs = toSortableMs(latestAt);
    if (latestMs && Date.now() - latestMs <= 15 * 60 * 1000) {
      return "active";
    }
    return "completed";
  }

  function collaborationInterSessionRouteLabel(sourceAgentId, targetAgentId, language = "zh") {
    return `${pickUiText(language, "Sending session", "发送会话")} ${humanizeOperatorLabel(sourceAgentId)} ⇄ ${pickUiText(language, "Receiving session", "接收会话")} ${humanizeOperatorLabel(targetAgentId)}`;
  }

  function collaborationInterSessionSummary(input) {
    const sourceLabel = humanizeOperatorLabel(input.sourceAgentId);
    const targetLabel = humanizeOperatorLabel(input.targetAgentId);
    if (input.status === "blocked") {
      return pickUiText(
        input.language,
        `${targetLabel} did not finish the latest cross-session reply and needs follow-up.`,
        `${targetLabel} 没有顺利完成最近一轮跨会话回复，当前需要跟进。`,
      );
    }
    if (input.status === "active") {
      return input.bidirectional
        ? pickUiText(
            input.language,
            `${sourceLabel} and ${targetLabel} are actively exchanging messages between existing sessions.`,
            `${sourceLabel} 和 ${targetLabel} 正在已有会话之间来回通信。`,
          )
        : pickUiText(
            input.language,
            `${sourceLabel} has sent a message into ${targetLabel}'s existing session, and the visible reply is still in progress.`,
            `${sourceLabel} 已向 ${targetLabel} 的既有会话发出消息，当前还在等待这一轮可见回复继续回来。`,
          );
    }
    if (input.status === "handoff") {
      return pickUiText(
        input.language,
        `${sourceLabel} has sent a message into ${targetLabel}'s existing session. The next visible reply has not returned yet.`,
        `${sourceLabel} 已把消息投递到 ${targetLabel} 的既有会话，下一条可见回复还没有回来。`,
      );
    }
    return input.bidirectional
      ? pickUiText(
          input.language,
          `${targetLabel} has already replied through its existing session. The latest visible exchange is complete.`,
          `${targetLabel} 已经通过自己的既有会话回了信，最近一轮可见通信已经完成。`,
        )
      : pickUiText(
          input.language,
          `${sourceLabel} finished the latest visible cross-session exchange with ${targetLabel}.`,
          `${sourceLabel} 和 ${targetLabel} 最近一轮可见跨会话通信已经结束。`,
        );
  }

  function collaborationInterSessionCurrentOwnerLabel(currentOwnerAgentId, language = "zh") {
    return pickUiText(
      language,
      `Now with ${humanizeOperatorLabel(currentOwnerAgentId)}`,
      `当前在 ${humanizeOperatorLabel(currentOwnerAgentId)}`,
    );
  }

  function buildInterSessionCollaborationTimelineSteps(input) {
    const steps = [];
    const firstSignal = input.signals[0];
    if (firstSignal) {
      steps.push({
        id: `${firstSignal.sourceSessionKey}:${firstSignal.targetSessionKey}:send`,
        agentId: input.sourceAgentId,
        roleLabel: pickUiText(input.language, "Sending session", "发送会话"),
        title: pickUiText(input.language, "Sent a cross-session message", "发起跨会话消息"),
        detail: summarizeVisibleSessionSnippet(firstSignal.snippet, input.language, 120),
        at: firstSignal.at ?? input.sourceSession?.latestHistoryAt ?? input.sourceSession?.lastMessageAt,
        tone: "info",
      });
    }

    const middleSignals = input.signals.slice(1, 3);
    for (const [index, signal] of middleSignals.entries()) {
      const sourceAgentId =
        normalizeAgentIdCandidate(extractAgentIdFromSessionKey(signal.sourceSessionKey)) ?? input.sourceAgentId;
      const isReply = normalizeLookupKey(sourceAgentId) === normalizeLookupKey(input.targetAgentId);
      steps.push({
        id: `${signal.sourceSessionKey}:${signal.targetSessionKey}:${index}`,
        agentId: sourceAgentId,
        roleLabel: pickUiText(
          input.language,
          isReply ? "Replying session" : "Sending session",
          isReply ? "回复会话" : "发送会话",
        ),
        title: pickUiText(
          input.language,
          isReply ? "Replied through its existing session" : "Sent another cross-session message",
          isReply ? "通过既有会话回信" : "继续发送跨会话消息",
        ),
        detail: summarizeVisibleSessionSnippet(signal.snippet, input.language, 120),
        at: signal.at,
        tone: index === middleSignals.length - 1 ? "ok" : "info",
      });
    }

    const latestSignal = input.signals.at(-1);
    if (
      latestSignal &&
      (!firstSignal || normalizeInlineText(latestSignal.snippet) !== normalizeInlineText(firstSignal.snippet))
    ) {
      const latestAgentId =
        normalizeAgentIdCandidate(extractAgentIdFromSessionKey(latestSignal.sourceSessionKey)) ?? input.targetAgentId;
      steps.push({
        id: `${latestSignal.sourceSessionKey}:${latestSignal.targetSessionKey}:latest`,
        agentId: latestAgentId,
        roleLabel: pickUiText(input.language, "Latest visible reply", "最近可见回复"),
        title: pickUiText(input.language, "Latest visible message", "最近可见消息"),
        detail: summarizeVisibleSessionSnippet(latestSignal.snippet, input.language, 120),
        at: latestSignal.at ?? input.targetSession?.latestHistoryAt ?? input.targetSession?.lastMessageAt,
        tone: "ok",
      });
    }

    if (steps.length === 0) {
      steps.push({
        id: `${input.sourceAgentId}:${input.targetAgentId}:fallback`,
        agentId: input.targetAgentId,
        roleLabel: pickUiText(input.language, "Receiving session", "接收会话"),
        title: pickUiText(input.language, "Visible communication only", "仅有跨会话通信信号"),
        detail: pickUiText(
          input.language,
          "The cross-session route is visible, but there is not enough recent text to summarize it yet.",
          "当前能看到跨会话通信关系，但最近的文本还不够生成摘要。",
        ),
        at: pickLatestTimestamp([
          input.sourceSession?.latestHistoryAt,
          input.sourceSession?.lastMessageAt,
          input.targetSession?.latestHistoryAt,
          input.targetSession?.lastMessageAt,
        ]),
        tone: "warn",
      });
    }

    return steps.slice(0, 4).sort((a, b) => toSortableMs(a.at) - toSortableMs(b.at));
  }

  function normalizeAgentIdCandidate(value) {
    const normalized = normalizeLookupKey(value ?? "");
    if (!normalized || normalized === "unassigned" || normalized === "未分配") {
      return void 0;
    }
    return normalized;
  }

  function resolveCollaborationThreadStatus(card) {
    if (card.state === "blocked" || card.state === "waiting_approval" || card.state === "error") {
      return "blocked";
    }
    if (card.state === "running" || card.executionChain.stage === "running") {
      return "active";
    }
    if (card.executionChain.stage === "accepted") {
      return "handoff";
    }
    return "completed";
  }

  function resolveCollaborationCurrentOwner(card, parentAgentId, childAgentId) {
    const status = resolveCollaborationThreadStatus(card);
    if (status === "handoff") {
      return childAgentId ?? parentAgentId;
    }
    if (status === "completed") {
      return childAgentId ?? parentAgentId;
    }
    return childAgentId ?? parentAgentId;
  }

  function collaborationParticipantRoleLabel(position, language = "zh") {
    return position === "parent"
      ? pickUiText(language, "Parent session", "父会话")
      : pickUiText(language, "Child session", "子会话");
  }

  function collaborationRoleAgentLabel(position, agentId, language = "zh") {
    const agentLabel = humanizeOperatorLabel(agentId);
    return position === "parent"
      ? pickUiText(language, `Parent ${agentLabel}`, `父会话 ${agentLabel}`)
      : pickUiText(language, `Child ${agentLabel}`, `子会话 ${agentLabel}`);
  }

  function collaborationRouteLabel(parentAgentId, childAgentId, hasChild, language = "zh") {
    if (!hasChild) {
      return collaborationRoleAgentLabel("parent", parentAgentId, language);
    }
    return `${collaborationRoleAgentLabel("parent", parentAgentId, language)} → ${collaborationRoleAgentLabel("child", childAgentId, language)}`;
  }

  function extractCollaborationTaskLabel(input, language) {
    const normalized = normalizeInlineText(input);
    if (!normalized) {
      return void 0;
    }
    const explicitTaskMatch = /(?:任务|目标|task|objective)\s*[:：]\s*([^。；\n]+)/i.exec(normalized);
    if (explicitTaskMatch?.[1]?.trim()) {
      return safeTruncate(explicitTaskMatch[1].trim(), 88);
    }
    const cronTaskMatch = /^\[[^\]]+\s+([^\]\s][^\]]*?)\]\s/.exec(normalized);
    if (cronTaskMatch?.[1]?.trim()) {
      return safeTruncate(cronTaskMatch[1].trim(), 88);
    }
    const chineseBracketMatch = /^(?:【([^】]+)】|「([^」]+)」)/.exec(normalized);
    const bracketLabel = chineseBracketMatch?.[1] ?? chineseBracketMatch?.[2];
    if (bracketLabel?.trim()) {
      return safeTruncate(bracketLabel.trim(), 88);
    }
    const firstClause = normalized
      .split(/\s+(?:→|->|=>)\s+/)
      .map((segment) => normalizeInlineText(segment))
      .find((segment) => segment.length >= 4);
    if (firstClause && !looksLikeStructuredExecutionTitle(firstClause)) {
      return safeTruncate(firstClause, 88);
    }
    if (!looksLikeStructuredExecutionTitle(normalized)) {
      return safeTruncate(normalized, 88);
    }
    const structuredSummary = summarizeStructuredSessionPayload(normalized, language);
    if (structuredSummary?.trim()) {
      return safeTruncate(structuredSummary, 88);
    }
    return void 0;
  }

  function deriveCollaborationTaskTitle(input) {
    const mappedTitle = executionChainCardTitle(input.card, input.language);
    const mappedLooksGeneric =
      /(?:隔离执行|关联任务|linked task|isolated execution|cron isolated run)/i.test(mappedTitle) ||
      /^(?:成功|失败|Succeeded|Failed)\b/.test(mappedTitle) ||
      /(?:查询|成功|扫描|入选|发送|Queries|Successful|Scanned|Qualified|Sent)\s+\d+/i.test(mappedTitle);
    if (!mappedLooksGeneric) {
      return mappedTitle;
    }
    const candidates = [
      input.childSession?.label,
      input.parentSession?.label,
      input.childSession?.taskSnippet,
      input.parentSession?.taskSnippet,
      input.childSession?.latestSnippet,
      input.parentSession?.latestSnippet,
      input.card.latestSnippet,
      input.card.executionChain.detail,
      input.card.taskTitle,
    ];
    for (const candidate of candidates) {
      const derived = extractCollaborationTaskLabel(candidate ?? "", input.language);
      if (derived?.trim()) {
        return derived;
      }
    }
    return mappedTitle;
  }

  function collaborationThreadStatusLabel(status, language = "zh") {
    if (status === "active") {
      return pickUiText(language, "In progress", "进行中");
    }
    if (status === "handoff") {
      return pickUiText(language, "Waiting handoff", "等待交接");
    }
    if (status === "blocked") {
      return pickUiText(language, "Blocked", "卡住");
    }
    return pickUiText(language, "Completed", "已完成");
  }

  function collaborationStatusRank(status) {
    if (status === "active") {
      return 4;
    }
    if (status === "blocked") {
      return 3;
    }
    if (status === "handoff") {
      return 2;
    }
    return 1;
  }

  function collaborationThreadSummary(input) {
    const parentLabel = collaborationRoleAgentLabel("parent", input.parentAgentId, input.language);
    const childLabel = collaborationRoleAgentLabel("child", input.childAgentId, input.language);
    if (input.status === "blocked") {
      if (input.card.state === "waiting_approval") {
        return pickUiText(
          input.language,
          `${childLabel} is waiting for approval before the handoff can continue.`,
          `${childLabel} 正在等待审批，这条交接要等这一段通过后才能继续。`,
        );
      }
      if (input.card.state === "error") {
        return pickUiText(
          input.language,
          `${childLabel} hit an error after the latest handoff.`,
          `${childLabel} 在最近一次交接后出现了错误。`,
        );
      }
      return pickUiText(
        input.language,
        `${childLabel} is blocked and needs follow-up before the thread can move again.`,
        `${childLabel} 当前卡住了，需要先跟进处理，这条协作线程才能继续。`,
      );
    }
    if (input.status === "active") {
      if (normalizeLookupKey(input.parentAgentId) !== normalizeLookupKey(input.childAgentId)) {
        return pickUiText(
          input.language,
          `${childLabel} is working after ${parentLabel} handed the task over.`,
          `${childLabel} 正在继续执行，前一步由 ${parentLabel} 完成交接。`,
        );
      }
      return pickUiText(
        input.language,
        `${childLabel} is continuing the isolated run after ${parentLabel} opened it.`,
        `${childLabel} 正在继续执行，前一步由 ${parentLabel} 在同一智能体里发起。`,
      );
    }
    if (input.status === "handoff") {
      if (normalizeLookupKey(input.parentAgentId) !== normalizeLookupKey(input.childAgentId)) {
        return pickUiText(
          input.language,
          `${parentLabel} handed the task to ${childLabel}. The next visible reply has not arrived yet.`,
          `${parentLabel} 已把任务交给 ${childLabel}，下一条可见回复还没有回来。`,
        );
      }
      return pickUiText(
        input.language,
        `${parentLabel} opened a child run in the same agent. The next visible reply is still pending.`,
        `${parentLabel} 已在同一智能体里发起子会话，但下一条可见回复还没出现。`,
      );
    }
    if (normalizeLookupKey(input.parentAgentId) !== normalizeLookupKey(input.childAgentId)) {
      return pickUiText(
        input.language,
        `${childLabel} finished the latest visible handoff from ${parentLabel}.`,
        `${childLabel} 已完成最近一轮由 ${parentLabel} 交接过来的工作。`,
      );
    }
    return pickUiText(
      input.language,
      `${childLabel} finished the latest visible isolated run after ${parentLabel} handed it off.`,
      `${childLabel} 已完成最近一轮由 ${parentLabel} 发起的隔离执行。`,
    );
  }

  function buildCollaborationTimelineSteps(input) {
    const steps = [];
    const parentLabel = collaborationRoleAgentLabel("parent", input.parentAgentId, input.language);
    const childLabel = collaborationRoleAgentLabel("child", input.childAgentId, input.language);
    const chain = input.card.executionChain;

    if (chain.accepted) {
      steps.push({
        id: `${input.card.sessionKey}:accepted`,
        agentId: input.parentAgentId,
        roleLabel: collaborationParticipantRoleLabel("parent", input.language),
        title: pickUiText(input.language, "Parent accepted work", "父会话接到任务"),
        detail: pickUiText(
          input.language,
          `${parentLabel} accepted the work in the parent session.`,
          `${parentLabel} 在父会话里接下了这件事。`,
        ),
        at: chain.acceptedAt ?? input.parentSession?.latestHistoryAt ?? input.parentSession?.lastMessageAt,
        tone: "info",
      });
    }

    if (chain.spawned) {
      steps.push({
        id: `${input.card.sessionKey}:spawned`,
        agentId: input.parentAgentId,
        roleLabel: collaborationParticipantRoleLabel("parent", input.language),
        title: pickUiText(input.language, "Parent opened child session", "父会话发起子会话"),
        detail:
          normalizeLookupKey(input.parentAgentId) === normalizeLookupKey(input.childAgentId)
            ? pickUiText(
                input.language,
                `${parentLabel} opened a child run in the same agent.`,
                `${parentLabel} 在同一智能体里开了一条子会话来继续执行。`,
              )
            : pickUiText(
                input.language,
                `${parentLabel} handed the work to ${childLabel}.`,
                `${parentLabel} 把这件事交给了 ${childLabel}。`,
              ),
        at: chain.spawnedAt ?? input.childSession?.latestHistoryAt ?? input.childSession?.lastMessageAt,
        tone: "info",
      });
    }

    if ((input.parentSession?.taskSnippet ?? input.parentSession?.latestSnippet)?.trim()) {
      steps.push({
        id: `${input.card.sessionKey}:parent-note`,
        agentId: input.parentAgentId,
        roleLabel: collaborationParticipantRoleLabel("parent", input.language),
        title: pickUiText(input.language, "Parent session note", "父会话说明"),
        detail: summarizeVisibleSessionSnippet(
          input.parentSession?.taskSnippet ?? input.parentSession?.latestSnippet ?? "",
          input.language,
          120,
        ),
        at: input.parentSession.latestHistoryAt ?? input.parentSession.lastMessageAt,
        tone: "ok",
      });
    }

    if (input.childSession?.latestSnippet?.trim()) {
      steps.push({
        id: `${input.card.sessionKey}:child-note`,
        agentId: input.childAgentId,
        roleLabel: collaborationParticipantRoleLabel("child", input.language),
        title: pickUiText(input.language, "Child session reply", "子会话最近回复"),
        detail: summarizeVisibleSessionSnippet(input.childSession.latestSnippet, input.language, 120),
        at: input.childSession.latestHistoryAt ?? input.childSession.lastMessageAt,
        tone:
          input.card.state === "blocked" ||
          input.card.state === "error" ||
          input.card.state === "waiting_approval"
            ? "blocked"
            : "ok",
      });
    }

    if (steps.length === 0) {
      steps.push({
        id: `${input.card.sessionKey}:fallback`,
        agentId: input.childAgentId,
        roleLabel: collaborationParticipantRoleLabel(
          normalizeLookupKey(input.parentAgentId) === normalizeLookupKey(input.childAgentId)
            ? "parent"
            : "child",
          input.language,
        ),
        title: pickUiText(input.language, "Visible chain only", "仅有执行链信号"),
        detail: pickUiText(
          input.language,
          "The handoff relationship is visible, but there is not enough recent session text to summarize it yet.",
          "当前能看到交接关系，但最近的会话文本还不够生成摘要。",
        ),
        at: input.card.latestAt,
        tone: "warn",
      });
    }

    return steps.slice(0, 4).sort((a, b) => toSortableMs(a.at) - toSortableMs(b.at));
  }

  return {
    buildCollaborationThreadCards,
    buildCollaborationTimelineSteps,
    buildInterSessionCollaborationCards,
    buildInterSessionCollaborationTimelineSteps,
    collaborationInterSessionCurrentOwnerLabel,
    collaborationInterSessionRouteLabel,
    collaborationInterSessionSummary,
    collaborationParticipantRoleLabel,
    collaborationRoleAgentLabel,
    collaborationRouteLabel,
    collaborationStatusRank,
    collaborationThreadKindLabel,
    collaborationThreadStatusLabel,
    collaborationThreadSummary,
    deriveCollaborationTaskTitle,
    deriveInterSessionTaskTitle,
    extractCollaborationTaskLabel,
    foldCollaborationThreadCards,
    mergeCollaborationThreadCards,
    normalizeAgentIdCandidate,
    resolveCollaborationCurrentOwner,
    resolveCollaborationThreadStatus,
    resolveInterSessionCollaborationStatus,
  };
}

export { createCollaborationThreadHelpers };

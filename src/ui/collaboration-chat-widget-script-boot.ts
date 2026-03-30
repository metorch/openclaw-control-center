import type { CollaborationChatScriptRenderInput } from "./collaboration-chat-widget-types";

function renderCollaborationChatScriptBoot(_input: CollaborationChatScriptRenderInput): string {
  return `
  const currentMentionQuery = () => {
    const text = inputNode.value;
    const caret = typeof inputNode.selectionStart === 'number' ? inputNode.selectionStart : text.length;
    const prefix = text.slice(0, caret);
    const match = prefix.match(/(^|\\s)@([^\\s@]*)$/);
    if (!match) return null;
    return {
      start: caret - String(match[2] || '').length - 1,
      end: caret,
      query: String(match[2] || '').toLowerCase(),
    };
  };

  const renderMentionMenu = () => {
    const mention = currentMentionQuery();
    if (!mention) {
      mentionsNode.hidden = true;
      mentionsNode.innerHTML = '';
      state.mentionMatches = [];
      return;
    }
    const matches = mentionableParticipants().filter((participant) => {
      const aliases = []
        .concat(participant.aliases || [])
        .concat([participant.mention, participant.displayName, participant.agentId])
        .map((value) => String(value || '').toLowerCase());
      return aliases.some((value) => value.includes(mention.query));
    }).slice(0, 6);
    state.mentionMatches = matches;
    state.activeMentionIndex = Math.min(state.activeMentionIndex, Math.max(0, matches.length - 1));
    if (matches.length === 0) {
      mentionsNode.hidden = true;
      mentionsNode.innerHTML = '';
      return;
    }
    mentionsNode.hidden = false;
    mentionsNode.innerHTML = matches.map((participant, index) => {
      const accent = (participant.identity && participant.identity.accent) || '#0f766e';
      const imageHref = participant.identity && participant.identity.imageHref ? participant.identity.imageHref : '';
      const alias = participantMentionAlias(participant);
      return '<button class="collab-chat-mention-option' + (index === state.activeMentionIndex ? ' is-active' : '') + '" type="button" data-mention-id="' + escapeHtml(participant.agentId) + '">' +
        buildAvatarMarkup({
          accent,
          imageHref,
          label: participant.displayName || participant.agentId || '?',
          statusTone: participantStatusTone(participant),
          statusLabel: participantStatusLabel(participant),
        }) +
        '<span class="collab-chat-event-copy"><strong>' + escapeHtml(participant.displayName) + '</strong><span>@' + escapeHtml(alias) + '</span></span>' +
      '</button>';
    }).join('');
  };

  const applyMention = (agentId) => {
    const mention = currentMentionQuery();
    const participant = findParticipant(agentId);
    if (!mention || !participant) return;
    const alias = participantMentionAlias(participant);
    const nextValue = inputNode.value.slice(0, mention.start) + '@' + alias + ' ' + inputNode.value.slice(mention.end);
    inputNode.value = nextValue;
    const nextCaret = mention.start + alias.length + 2;
    inputNode.focus();
    inputNode.setSelectionRange(nextCaret, nextCaret);
    mentionsNode.hidden = true;
    mentionsNode.innerHTML = '';
    state.mentionMatches = [];
    routeNode.textContent = routeLabelForText(inputNode.value);
    syncComposerState();
  };

  const insertParticipantMention = (agentId) => {
    const participant = findParticipant(agentId);
    if (!participant) return;
    const alias = participantMentionAlias(participant);
    if (!alias) return;
    const start = typeof inputNode.selectionStart === 'number' ? inputNode.selectionStart : inputNode.value.length;
    const end = typeof inputNode.selectionEnd === 'number' ? inputNode.selectionEnd : start;
    const prefix = inputNode.value.slice(0, start);
    const suffix = inputNode.value.slice(end);
    const needsLeadingSpace = prefix.length > 0 && !/\\s$/.test(prefix);
    const insertion = (needsLeadingSpace ? ' ' : '') + '@' + alias + ' ';
    const nextValue = prefix + insertion + suffix;
    const caret = prefix.length + insertion.length;
    inputNode.value = nextValue;
    inputNode.focus();
    inputNode.setSelectionRange(caret, caret);
    routeNode.textContent = routeLabelForText(inputNode.value);
    renderMentionMenu();
    syncComposerState();
  };

  const clearPersonCardHideTimer = () => {
    if (!state.personCardHideTimer) return;
    window.clearTimeout(state.personCardHideTimer);
    state.personCardHideTimer = 0;
  };

  const hidePersonCard = () => {
    clearPersonCardHideTimer();
    state.activePersonCardAgentId = '';
    personCard.hidden = true;
    personCard.innerHTML = '';
  };

  const scheduleHidePersonCard = () => {
    clearPersonCardHideTimer();
    state.personCardHideTimer = window.setTimeout(() => {
      hidePersonCard();
    }, 90);
  };

  const showPersonCard = (agentId, anchor) => {
    if (!(anchor instanceof HTMLElement) || isCompactViewport()) {
      hidePersonCard();
      return;
    }
    const participant = findParticipant(agentId);
    if (!participant) {
      hidePersonCard();
      return;
    }
    clearPersonCardHideTimer();
    state.activePersonCardAgentId = participant.agentId;
    personCard.innerHTML = buildPersonCardMarkup(participant);
    personCard.hidden = false;
    window.requestAnimationFrame(() => {
      if (personCard.hidden) return;
      const panelRect = panel.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const cardWidth = personCard.offsetWidth || 240;
      const cardHeight = personCard.offsetHeight || 160;
      let left = anchorRect.right - panelRect.left + 12;
      left = Math.max(112, Math.min(left, panelRect.width - cardWidth - 16));
      let top = anchorRect.top - panelRect.top + (anchorRect.height / 2) - (cardHeight / 2);
      top = Math.max(16, Math.min(top, panelRect.height - cardHeight - 16));
      personCard.style.left = String(left) + 'px';
      personCard.style.top = String(top) + 'px';
    });
  };

  const saveAttachment = async (attachmentId) => {
    const attachment = state.attachmentIndex.get(attachmentId);
    if (!attachment) return;
    try {
      if (typeof window.showSaveFilePicker === 'function') {
        const handle = await window.showSaveFilePicker({ suggestedName: attachment.fileName });
        const response = await fetch(attachment.contentHref, {
          headers: { accept: attachment.contentType || 'application/octet-stream' },
          cache: 'no-store',
        });
        const blob = await response.blob();
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setStatus(labels.save);
        return;
      }
    } catch {}
    const link = document.createElement('a');
    link.href = attachment.downloadHref || attachment.contentHref;
    link.download = attachment.fileName || 'attachment';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const openAttachment = (attachmentId) => {
    const attachment = state.attachmentIndex.get(attachmentId);
    if (!attachment) return;
    const href = attachment.contentHref || attachment.downloadHref;
    if (!href) return;
    const opened = window.open(href, '_blank', 'noopener,noreferrer');
    if (opened) return;
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const stopResize = (persist = true) => {
    if (!state.resizeSession) return;
    state.resizeSession = null;
    panel.classList.remove('is-resizing');
    document.body.style.removeProperty('cursor');
    if (persist) applyPanelSize(true);
  };

  const onResizeMove = (event) => {
    if (!state.resizeSession || isCompactViewport()) return;
    const deltaX = Number(event.clientX) - state.resizeSession.startX;
    const deltaY = Number(event.clientY) - state.resizeSession.startY;
    state.panelSize = {
      width: state.resizeSession.startWidth - deltaX,
      height: state.resizeSession.startHeight - deltaY,
    };
    applyPanelSize(false);
  };

  const onResizeEnd = () => {
    stopResize(true);
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeEnd);
    window.removeEventListener('pointercancel', onResizeEnd);
  };

  const beginResize = (event) => {
    if (isCompactViewport()) return;
    event.preventDefault();
    const rect = panel.getBoundingClientRect();
    state.resizeSession = {
      startX: Number(event.clientX),
      startY: Number(event.clientY),
      startWidth: rect.width,
      startHeight: rect.height,
    };
    panel.classList.add('is-resizing');
    document.body.style.cursor = 'nwse-resize';
    if (typeof resizeHandle.setPointerCapture === 'function' && typeof event.pointerId === 'number') {
      try {
        resizeHandle.setPointerCapture(event.pointerId);
      } catch {}
    }
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeEnd);
    window.addEventListener('pointercancel', onResizeEnd);
  };

  const roomSelectorContainsTarget = (target) =>
    target instanceof Node && (roomTrigger.contains(target) || roomList.contains(target));
  const findPersonButton = (target) =>
    target instanceof HTMLElement ? target.closest('[data-person-agent]') : null;
  const beginFileDrag = () => {
    state.fileDragDepth += 1;
    syncFileDropState(true);
  };
  const endFileDrag = () => {
    state.fileDragDepth = Math.max(0, state.fileDragDepth - 1);
    if (state.fileDragDepth === 0) clearFileDropState();
  };
  const handleTransferQueue = (files, source = 'drop') => {
    if (!Array.isArray(files) || files.length === 0) return;
    queueFiles(files);
    if (source === 'paste' || source === 'drop') {
      inputNode.focus();
    }
  };

  const openRoomFromExternalTrigger = async (roomId, source = 'external') => {
    const normalizedRoomId = String(roomId || '').trim();
    if (!normalizedRoomId) return false;
    setExpanded(true);
    await activateRoom(normalizedRoomId);
    window.requestAnimationFrame(() => {
      inputNode.focus();
    });
    return true;
  };

  window.__openclawOpenCollaborationRoom = (roomId, source) => openRoomFromExternalTrigger(roomId, source);

  toggleButton.addEventListener('click', () => {
    setExpanded(!state.expanded);
    if (state.expanded) void refreshRoom('manual');
  });
  refreshButton.addEventListener('click', () => {
    setRoomMenuOpen(false);
    void refreshRoom('manual');
  });
  autoButton.addEventListener('click', () => { setAutoRefresh(!state.autoRefresh); });
  createButton.addEventListener('click', () => { void createRoom(); });
  terminateButton.addEventListener('click', () => { void terminateCurrentRoomWork(); });
  adjudicateButtons.forEach((button) => {
    button.addEventListener('click', () => {
      void adjudicateCurrentRoomOutcome(button.dataset.collabRoomAdjudicateOutcome || '');
    });
  });
  sendButton.addEventListener('click', () => { void sendCurrentMessage(); });
  fileInput.addEventListener('change', () => {
    queueFiles(fileInput.files);
    fileInput.value = '';
  });
  resizeHandle.addEventListener('pointerdown', beginResize);
  roomTrigger.addEventListener('click', () => {
    if (roomTrigger.disabled) return;
    setRoomMenuOpen(!state.roomMenuOpen);
  });
  panel.addEventListener('dragenter', (event) => {
    if (!state.expanded || !hasFileTransfer(event.dataTransfer)) return;
    event.preventDefault();
    beginFileDrag();
  });
  panel.addEventListener('dragover', (event) => {
    if (!state.expanded || !hasFileTransfer(event.dataTransfer)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    syncFileDropState(true);
  });
  panel.addEventListener('dragleave', (event) => {
    if (!state.expanded || !hasFileTransfer(event.dataTransfer)) return;
    if (event.relatedTarget instanceof Node && panel.contains(event.relatedTarget)) return;
    endFileDrag();
  });
  panel.addEventListener('drop', (event) => {
    if (!state.expanded || !hasFileTransfer(event.dataTransfer)) return;
    event.preventDefault();
    const files = collectTransferFiles(event.dataTransfer);
    clearFileDropState();
    handleTransferQueue(files, 'drop');
  });

  inputNode.addEventListener('input', () => {
    routeNode.textContent = routeLabelForText(inputNode.value);
    renderMentionMenu();
    syncComposerState();
  });
  inputNode.addEventListener('keydown', (event) => {
    if (!mentionsNode.hidden && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const size = state.mentionMatches.length || 1;
      state.activeMentionIndex = (state.activeMentionIndex + delta + size) % size;
      renderMentionMenu();
      return;
    }
    if (!mentionsNode.hidden && event.key === 'Enter' && state.mentionMatches[state.activeMentionIndex]) {
      event.preventDefault();
      applyMention(state.mentionMatches[state.activeMentionIndex].agentId);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      void sendCurrentMessage();
      return;
    }
    if (event.key === 'Escape') {
      if (state.pendingDeleteRoomId) {
        closeDeleteConfirm();
        return;
      }
      if (state.roomMenuOpen) setRoomMenuOpen(false);
      if (!mentionsNode.hidden) {
        mentionsNode.hidden = true;
        mentionsNode.innerHTML = '';
        state.mentionMatches = [];
      }
    }
  });
  inputNode.addEventListener('blur', () => {
    window.setTimeout(() => {
      mentionsNode.hidden = true;
    }, 120);
  });
  inputNode.addEventListener('focus', () => {
    renderMentionMenu();
  });
  inputNode.addEventListener('paste', (event) => {
    if (!state.expanded || !hasFileTransfer(event.clipboardData)) return;
    const files = collectTransferFiles(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    handleTransferQueue(files, 'paste');
  });

  roomList.addEventListener('click', (event) => {
    const deleteTarget = event.target instanceof HTMLElement ? event.target.closest('[data-room-delete]') : null;
    if (deleteTarget instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      requestDeleteRoom(deleteTarget.getAttribute('data-room-delete') || '');
      return;
    }
    const target = event.target instanceof HTMLElement ? event.target.closest('[data-room-switch]') : null;
    if (!(target instanceof HTMLButtonElement)) return;
    const roomId = target.getAttribute('data-room-switch') || '';
      void activateRoom(roomId);
  });
  deleteDialog.addEventListener('click', (event) => {
    if (state.roomMutationPending) return;
    if (event.target !== deleteDialog) return;
    closeDeleteConfirm();
  });
  deleteDialogSurface.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  deleteDialogCancel.addEventListener('click', () => {
    closeDeleteConfirm();
  });
  deleteDialogConfirm.addEventListener('click', () => {
    void deleteRoom(state.pendingDeleteRoomId || state.activeRoomId);
  });
  rosterList.addEventListener('click', (event) => {
    const target = findPersonButton(event.target);
    if (!(target instanceof HTMLButtonElement)) return;
    insertParticipantMention(target.getAttribute('data-person-agent') || '');
  });
  rosterList.addEventListener('pointerover', (event) => {
    const target = findPersonButton(event.target);
    if (!(target instanceof HTMLButtonElement)) return;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    showPersonCard(target.getAttribute('data-person-agent') || '', target);
  });
  rosterList.addEventListener('pointerout', (event) => {
    const target = findPersonButton(event.target);
    if (!(target instanceof HTMLButtonElement)) return;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    scheduleHidePersonCard();
  });
  rosterList.addEventListener('focusin', (event) => {
    const target = findPersonButton(event.target);
    if (!(target instanceof HTMLButtonElement)) return;
    showPersonCard(target.getAttribute('data-person-agent') || '', target);
  });
  rosterList.addEventListener('focusout', (event) => {
    const target = findPersonButton(event.target);
    if (!(target instanceof HTMLButtonElement)) return;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    scheduleHidePersonCard();
  });
  uploadList.addEventListener('click', (event) => {
    const retryTarget = event.target instanceof HTMLElement ? event.target.closest('[data-upload-retry]') : null;
    if (retryTarget instanceof HTMLButtonElement) {
      const uploadId = retryTarget.getAttribute('data-upload-retry') || '';
      void retryUpload(uploadId);
      return;
    }
    const target = event.target instanceof HTMLElement ? event.target.closest('[data-upload-remove]') : null;
    if (!(target instanceof HTMLButtonElement)) return;
    const uploadId = target.getAttribute('data-upload-remove') || '';
    state.uploads = state.uploads.filter((item) => item.id !== uploadId);
    renderUploads();
    renderRooms();
    syncComposerState();
  });
  mentionsNode.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest('[data-mention-id]') : null;
    if (!(target instanceof HTMLButtonElement)) return;
    applyMention(target.getAttribute('data-mention-id') || '');
  });
  eventsList.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest('[data-save-attachment]') : null;
    if (target instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      void saveAttachment(target.getAttribute('data-save-attachment') || '');
      return;
    }
    const openTarget = event.target instanceof HTMLElement ? event.target.closest('[data-open-attachment]') : null;
    if (!(openTarget instanceof HTMLElement)) return;
    const attachmentId = openTarget.getAttribute('data-open-attachment') || '';
    if (!attachmentId) return;
    event.preventDefault();
    openAttachment(attachmentId);
  });
  eventsList.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target instanceof HTMLElement ? event.target.closest('[data-open-attachment]') : null;
    if (!(target instanceof HTMLElement)) return;
    const attachmentId = target.getAttribute('data-open-attachment') || '';
    if (!attachmentId) return;
    event.preventDefault();
    openAttachment(attachmentId);
  });

  window.addEventListener(mutationEventName, () => {
    syncComposerState();
    schedulePolling();
  });
  window.addEventListener('openclaw:collaboration-room-open', (event) => {
    const roomId = event instanceof CustomEvent ? event.detail?.roomId : '';
    void openRoomFromExternalTrigger(roomId, event instanceof CustomEvent ? event.detail?.source : 'event');
  });
  window.addEventListener('resize', () => {
    applyPanelSize(false);
    setRoomMenuOpen(false);
    clearFileDropState();
    hidePersonCard();
    renderRooms();
    renderRoster();
  });
  document.addEventListener('dragover', (event) => {
    if (!state.expanded || !hasFileTransfer(event.dataTransfer)) return;
    event.preventDefault();
  });
  document.addEventListener('drop', (event) => {
    if (!state.expanded || !hasFileTransfer(event.dataTransfer)) return;
    event.preventDefault();
    if (panel.contains(event.target instanceof Node ? event.target : null)) return;
    clearFileDropState();
  });
  document.addEventListener('dragend', () => {
    clearFileDropState();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!state.roomMenuOpen) return;
    if (roomSelectorContainsTarget(event.target)) return;
    setRoomMenuOpen(false);
  });
  document.addEventListener('pointerdown', (event) => {
    if (personCard.hidden) return;
    if (findPersonButton(event.target)) return;
    hidePersonCard();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (state.pendingDeleteRoomId) {
      closeDeleteConfirm();
      return;
    }
    if (state.roomMenuOpen) setRoomMenuOpen(false);
    hidePersonCard();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') clearFileDropState();
    void refreshFromPresenceChange();
  });
  window.addEventListener('focus', () => {
    void refreshFromPresenceChange();
  });

  setExpanded(state.expanded);
  setAutoRefresh(state.autoRefresh);
  renderAll();
  void refreshRoom('manual');
})();
</script>`;
}

export { renderCollaborationChatScriptBoot };

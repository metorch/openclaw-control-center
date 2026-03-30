// @ts-nocheck

function renderCollaborationRoomOpenScript(language = "zh") {
  return `<script>
(() => {
  const roomOpenEventName = 'openclaw:collaboration-room-open';

  const openRoomDirect = (roomId, source) => {
    const normalizedRoomId = String(roomId || '').trim();
    if (!normalizedRoomId) return false;
    if (typeof window.__openclawOpenCollaborationRoom === 'function') {
      try {
        return window.__openclawOpenCollaborationRoom(normalizedRoomId, String(source || '').trim() || 'dashboard') !== false;
      } catch {}
    }
    window.dispatchEvent(
      new CustomEvent(roomOpenEventName, {
        detail: {
          roomId: normalizedRoomId,
          source: String(source || '').trim() || 'dashboard',
        },
      }),
    );
    return true;
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest('[data-collaboration-room-open]');
    if (!(control instanceof HTMLElement)) return;
    const roomId = (control.dataset.collaborationRoomOpen || '').trim();
    if (!roomId) return;
    event.preventDefault();
    openRoomDirect(roomId, control.dataset.collaborationRoomSource || 'dashboard');
  });
})();
</script>`;
}

export { renderCollaborationRoomOpenScript };

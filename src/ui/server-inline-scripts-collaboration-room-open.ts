// @ts-nocheck

function renderCollaborationRoomOpenScript(language = "zh") {
  return `<script>
(() => {
  const roomOpenEventName = 'openclaw:collaboration-room-open';

  const dispatchRoomOpen = (roomId, source) => {
    const normalizedRoomId = String(roomId || '').trim();
    if (!normalizedRoomId) return false;
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
    dispatchRoomOpen(roomId, control.dataset.collaborationRoomSource || 'dashboard');
  });
})();
</script>`;
}

export { renderCollaborationRoomOpenScript };

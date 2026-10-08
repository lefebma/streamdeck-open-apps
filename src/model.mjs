export const PAGE_SIZE = 6;

// Switching focus never changes key positions. New apps go at the end.
export function reconcileApps(previous, incoming) {
  const byPid = new Map(incoming.map(app => [app.pid, app]));
  const retained = previous.filter(app => byPid.has(app.pid) && byPid.get(app.pid).id === app.id);
  const retainedPids = new Set(retained.map(app => app.pid));
  const added = incoming.filter(app => !retainedPids.has(app.pid))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...retained.map(app => byPid.get(app.pid)), ...added];
}

export function pageCount(apps) {
  return Math.max(1, Math.ceil(apps.length / PAGE_SIZE));
}

export function clampPage(page, apps) {
  return Math.min(Math.max(0, page), pageCount(apps) - 1);
}

export function slotAt(coordinates) {
  const slot = coordinates ? coordinates.row * 4 + coordinates.column : -1;
  return slot >= 0 && slot < PAGE_SIZE ? slot : null;
}

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[char]));
}

export function appImage(app, activePid) {
  const active = app?.pid === activePid;
  const border = active ? '#80efb6' : '#303747';
  const icon = app?.icon
    ? `<image x="24" y="14" width="96" height="96" href="data:image/png;base64,${app.icon}"/>`
    : `<text x="72" y="83" text-anchor="middle" fill="#8d98aa" font-family="Arial" font-size="38">${escapeXml(app?.name?.slice(0, 1) || '—')}</text>`;
  return svgUrl(`<rect width="144" height="144" rx="18" fill="#10151e"/><rect x="3" y="3" width="138" height="138" rx="16" fill="none" stroke="${border}" stroke-width="${active ? 5 : 2}"/>${icon}`);
}

export function navImage(direction, enabled) {
  const path = direction < 0 ? '88 35 51 72 88 109' : '56 35 93 72 56 109';
  return svgUrl(`<rect width="144" height="144" rx="18" fill="#10151e"/><polyline points="${path}" fill="none" stroke="${enabled ? '#80efb6' : '#495265'}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`);
}

function svgUrl(body) {
  return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="144" height="144">${body}</svg>`).toString('base64')}`;
}

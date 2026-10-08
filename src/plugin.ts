import streamDeck, { action, SingletonAction, type KeyDownEvent, type WillAppearEvent, type WillDisappearEvent } from '@elgato/streamdeck';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { reconcileApps, clampPage, pageCount, slotAt, appImage, navImage, PAGE_SIZE } from './model.mjs';

type App = { id: string; pid: number; name: string; icon: string };
type Visible = { key: any; device: string; slot: number | null; direction: number; target?: App; last?: string };
const visible = new Map<string, Visible>();
const pages = new Map<string, number>();
const pending = new Map<string, { resolve: (ok: boolean) => void; timeout: NodeJS.Timeout }>();
let apps: App[] = [];
let activePid = 0;
let helper: ChildProcessWithoutNullStreams | undefined;
let helperReady = false;
let shuttingDown = false;
let rendering = false;
let dirty = false;

async function render() {
  dirty = true;
  if (rendering) return;
  rendering = true;
  try {
    while (dirty) {
      dirty = false;
      for (const [context, item] of visible) {
        const page = clampPage(pages.get(item.device) ?? 0, apps);
        pages.set(item.device, page);
        const app = item.slot === null ? undefined : apps[page * PAGE_SIZE + item.slot];
        const enabled = item.direction < 0 ? page > 0 : page + 1 < pageCount(apps);
        const title = !helperReady ? 'Connecting…' : item.direction
          ? `${item.direction < 0 ? 'Prev' : 'Next'}\n${page + 1}/${pageCount(apps)}`
          : app?.name.replace(/\s+/g, '\n') || (item.slot === null ? 'Use slots\n1–6' : '');
        const fingerprint = `${helperReady}:${page}:${app?.pid}:${app?.id}:${app?.icon}:${app?.pid === activePid}:${title}:${enabled}`;
        if (item.last === fingerprint) continue;
        // Bind the press target to the icon being displayed, even if another snapshot arrives.
        item.target = helperReady ? app : undefined;
        try {
          await item.key.setImage(item.direction ? navImage(item.direction, enabled) : appImage(app, activePid));
          await item.key.setTitle(title);
          if (visible.get(context) === item) item.last = fingerprint;
        } catch (error) { streamDeck.logger.debug('Key disappeared during refresh', String(error)); }
      }
    }
  } finally { rendering = false; }
}

function failPending() {
  for (const entry of pending.values()) { clearTimeout(entry.timeout); entry.resolve(false); }
  pending.clear();
}

function startHelper() {
  if (shuttingDown || helper) return;
  const process = spawn(fileURLToPath(new URL('./open-apps-helper', import.meta.url)), [], { stdio: ['pipe', 'pipe', 'pipe'] });
  helper = process;
  createInterface({ input: process.stdout }).on('line', line => {
    try {
      const data = JSON.parse(line);
      if (data.type === 'snapshot' && Array.isArray(data.apps)) {
        helperReady = true;
        apps = reconcileApps(apps, data.apps);
        activePid = data.activePid;
        void render().catch(error => streamDeck.logger.error(String(error)));
      } else if (data.type === 'result') {
        const entry = pending.get(data.requestId);
        if (entry) { pending.delete(data.requestId); clearTimeout(entry.timeout); entry.resolve(data.ok === true); }
      }
    } catch (error) { streamDeck.logger.error('Invalid helper response', String(error)); }
  });
  process.stderr.on('data', chunk => streamDeck.logger.warn(String(chunk).trim()));
  process.stdin.on('error', () => failPending());
  process.on('error', error => streamDeck.logger.error('App helper failed', String(error)));
  process.on('close', () => {
    if (helper !== process) return;
    helper = undefined;
    helperReady = false;
    failPending();
    void render().catch(error => streamDeck.logger.error(String(error)));
    if (!shuttingDown && visible.size) setTimeout(startHelper, 3000);
  });
}

function activate(app: App): Promise<boolean> {
  if (!helperReady || !helper?.stdin.writable) return Promise.resolve(false);
  const requestId = randomUUID();
  return new Promise(resolve => {
    const timeout = setTimeout(() => { pending.delete(requestId); resolve(false); }, 3000);
    pending.set(requestId, { resolve, timeout });
    helper!.stdin.write(JSON.stringify({ pid: app.pid, id: app.id, requestId }) + '\n');
  });
}

class BaseAction extends SingletonAction {
  direction = 0;
  override onWillAppear(ev: WillAppearEvent) {
    if (!ev.action.isKey()) return;
    visible.set(ev.action.id, { key: ev.action, device: ev.action.device.id, slot: this.direction ? null : slotAt(ev.payload.coordinates), direction: this.direction });
    startHelper();
    void render().catch(error => streamDeck.logger.error(String(error)));
  }
  override onWillDisappear(ev: WillDisappearEvent) {
    visible.delete(ev.action.id);
    if (!visible.size && helper) { helper.stdin.end(); }
  }
  override async onKeyDown(ev: KeyDownEvent) {
    const item = visible.get(ev.action.id);
    if (!item || !helperReady) { await ev.action.showAlert(); return; }
    if (item.direction) {
      const page = pages.get(item.device) ?? 0;
      pages.set(item.device, clampPage(page + item.direction, apps));
      await render();
    } else if (item.target) {
      if (!await activate(item.target)) { streamDeck.logger.warn('App activation failed'); await ev.action.showAlert(); }
    }
  }
}
@action({ UUID: 'com.marclefebvre.openapps.app' })
class AppAction extends BaseAction {}
@action({ UUID: 'com.marclefebvre.openapps.previous' })
class PreviousAction extends BaseAction { direction = -1; }
@action({ UUID: 'com.marclefebvre.openapps.next' })
class NextAction extends BaseAction { direction = 1; }
@action({ UUID: 'com.marclefebvre.openapps.open' })
class OpenAction extends SingletonAction {
  override async onKeyDown(ev: KeyDownEvent) {
    await streamDeck.profiles.switchToProfile(ev.action.device.id, 'profiles/open-apps');
  }
}

streamDeck.actions.registerAction(new AppAction());
streamDeck.actions.registerAction(new PreviousAction());
streamDeck.actions.registerAction(new NextAction());
streamDeck.actions.registerAction(new OpenAction());
// Preserve the user's current profile on install and on every restart.
streamDeck.connect().catch(error => streamDeck.logger.error('Open Apps connection failed', String(error)));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => {
  shuttingDown = true;
  helper?.kill();
  failPending();
  process.exit(0);
});

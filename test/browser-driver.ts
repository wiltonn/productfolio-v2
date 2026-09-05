/**
 * A very small Chrome DevTools Protocol driver, so client behaviour can be tested in a real
 * browser without adding a dependency to a project that has none.
 *
 * It does only what the regression tests need: open a page, evaluate expressions in it, and
 * — the reason it exists at all — hold HTTP requests at the network boundary. Delaying a
 * request's *arrival* is the only way to reproduce a save-ordering bug honestly; a page can
 * delay its own responses, but it cannot reorder what the server has already accepted.
 *
 * If no Chrome is installed, `findChrome()` returns null and the browser suites skip rather
 * than fail: they need a browser, and a machine without one is not a broken build.
 */

import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';

type ChromeProcess = ChildProcessByStdio<null, Readable, Readable>;

const CANDIDATES = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

/** Browsers that Playwright or Puppeteer have already downloaded, if either is around. */
function cachedBrowsers(): string[] {
  const found: string[] = [];
  const roots = [
    { dir: join(homedir(), '.cache', 'ms-playwright'), leaves: ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-headless-shell-linux64/chrome-headless-shell'] },
    { dir: join(homedir(), '.cache', 'puppeteer', 'chrome'), leaves: ['chrome-linux64/chrome'] },
  ];
  for (const { dir, leaves } of roots) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      for (const leaf of leaves) {
        const candidate = join(dir, entry, ...leaf.split('/'));
        if (existsSync(candidate)) found.push(candidate);
      }
    }
  }
  // Newest build first: the directories are suffixed with an ascending revision number.
  return found.sort().reverse();
}

export function findChrome(): string | null {
  const explicit = process.env.PRODUCTFOLIO_CHROME;
  if (explicit && existsSync(explicit)) return explicit;
  for (const path of [...CANDIDATES, ...cachedBrowsers()]) if (existsSync(path)) return path;
  return null;
}

interface Pending {
  resolve: (value: Record<string, unknown>) => void;
  reject: (reason: Error) => void;
}

type Listener = (params: Record<string, unknown>) => void;

/** One paused request, and the decision the test wants to make about it. */
export interface PausedRequest {
  url: string;
  method: string;
  postData: string;
}

export class Page {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly dialogWaiters: Array<{ accept: boolean; resolve: (message: string) => void }> = [];
  private closed = false;

  private constructor(
    private readonly proc: ChromeProcess,
    private readonly ws: WebSocket,
    private readonly profileDir: string,
    private sessionId: string,
  ) {}

  static async launch(executable: string): Promise<Page> {
    const profileDir = mkdtempSync(join(tmpdir(), 'productfolio-chrome-'));
    const proc = spawn(
      executable,
      [
        '--headless=new',
        '--remote-debugging-port=0',
        `--user-data-dir=${profileDir}`,
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        'about:blank',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    const endpoint = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chrome did not report a DevTools endpoint')), 20000);
      let buffered = '';
      proc.stderr.on('data', (chunk: Buffer) => {
        buffered += chunk.toString('utf8');
        const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffered);
        if (match) {
          clearTimeout(timer);
          resolve(match[1]!);
        }
      });
      proc.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Chrome exited before it was ready (code ${code})`));
      });
    });

    const ws = new WebSocket(endpoint);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener('error', () => reject(new Error('Could not connect to Chrome')), { once: true });
    });

    const page = new Page(proc, ws, profileDir, '');
    ws.addEventListener('message', (event) => page.receive(String(event.data)));

    const target = (await page.send('Target.createTarget', { url: 'about:blank' })) as { targetId: string };
    const attached = (await page.send('Target.attachToTarget', { targetId: target.targetId, flatten: true })) as {
      sessionId: string;
    };
    page.sessionId = attached.sessionId;

    await page.send('Page.enable');
    await page.send('Runtime.enable');

    // Native dialogs block the renderer, and the page raises one whenever it is asked to
    // leave with unsaved work — which is the point. Answer them, so a test can navigate.
    page.on('Page.javascriptDialogOpening', (params) => page.answerDialog(params));
    return page;
  }

  private receive(raw: string): void {
    const message = JSON.parse(raw) as {
      id?: number;
      method?: string;
      params?: Record<string, unknown>;
      result?: Record<string, unknown>;
      error?: { message: string };
    };
    if (message.id !== undefined) {
      const waiting = this.pending.get(message.id);
      if (!waiting) return;
      this.pending.delete(message.id);
      if (message.error) waiting.reject(new Error(message.error.message));
      else waiting.resolve(message.result ?? {});
      return;
    }
    if (!message.method) return;
    for (const listener of this.listeners.get(message.method) ?? []) listener(message.params ?? {});
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    if (this.closed) return Promise.reject(new Error('The page is closed'));
    const id = this.nextId++;
    const payload: Record<string, unknown> = { id, method, params };
    if (this.sessionId && !method.startsWith('Target.')) payload.sessionId = this.sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  on(event: string, listener: Listener): void {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(event, set);
  }

  off(event: string): void {
    this.listeners.delete(event);
  }

  async goto(url: string): Promise<void> {
    const loaded = new Promise<void>((resolve) => {
      const done = () => {
        this.listeners.get('Page.loadEventFired')?.delete(done);
        resolve();
      };
      this.on('Page.loadEventFired', done);
    });
    await this.send('Page.navigate', { url });
    await loaded;
    // The script is deferred, so wait until it has installed its test hook.
    await this.waitFor('!!window.__productfolio');
  }

  /** Evaluates an expression in the page and returns its value. */
  async eval<T = unknown>(expression: string): Promise<T> {
    const result = (await this.send('Runtime.evaluate', {
      expression: `(() => { ${expression} })()`,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    })) as { result?: { value?: T }; exceptionDetails?: { exception?: { description?: string }; text?: string } };
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'evaluation failed');
    }
    return result.result?.value as T;
  }

  /** Polls a boolean expression until it holds. */
  async waitFor(expression: string, timeoutMs = 10000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const ok = await this.eval<boolean>(`return !!(${expression});`).catch(() => false);
      if (ok) return;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for: ${expression}`);
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  /** Waits until the page's save queue is idle. */
  async settle(timeoutMs = 15000): Promise<void> {
    await this.waitFor('window.__productfolio.pending() === 0', timeoutMs);
  }

  /**
   * Holds every request at the network boundary and hands it to `decide`, which returns how
   * many milliseconds to wait before letting it through. This is what lets a test delay one
   * save's *arrival* until another has been written.
   */
  async interceptRequests(decide: (request: PausedRequest) => number): Promise<void> {
    this.on('Fetch.requestPaused', (params) => {
      const requestId = params.requestId as string;
      const request = params.request as { url: string; method: string; postData?: string };
      const delay = decide({ url: request.url, method: request.method, postData: request.postData ?? '' });
      const release = () => {
        this.send('Fetch.continueRequest', { requestId }).catch(() => {});
      };
      if (delay > 0) setTimeout(release, delay);
      else release();
    });
    await this.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  }

  async stopIntercepting(): Promise<void> {
    await this.send('Fetch.disable').catch(() => {});
    this.off('Fetch.requestPaused');
  }

  private answerDialog(params: Record<string, unknown>): void {
    const waiting = this.dialogWaiters.shift();
    this.send('Page.handleJavaScriptDialog', { accept: waiting ? waiting.accept : true }).catch(() => {});
    if (waiting) waiting.resolve(String(params.message ?? ''));
  }

  /**
   * Claims the next dialog the page opens — a `confirm()`, or the browser's own prompt about
   * leaving with unsaved work — answers it as asked, and reports what it said. Dialogs no
   * test has claimed are accepted, so navigation is never left blocked.
   */
  nextJavaScriptDialog(accept: boolean): Promise<string> {
    return new Promise((resolve) => {
      this.dialogWaiters.push({ accept, resolve });
    });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      this.ws.close();
    } catch {
      /* already gone */
    }
    this.proc.kill('SIGKILL');
    await new Promise((r) => setTimeout(r, 50));
    rmSync(this.profileDir, { recursive: true, force: true });
  }
}

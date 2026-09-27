/**
 * Mock AI generation layer.
 * Drop in real model / API calls here later without changing ComicPanelEditor state logic.
 */
import type { AIContribution, Point, Stroke, StyleContext } from './types';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a simple organic stroke curve inside a 4:3 unit space (0–1 normalized). */
function fakeStroke(
  rand: () => number,
  kind: 'arc' | 'horizon' | 'figure' | 'detail',
): Point[] {
  const pts: Point[] = [];
  const n = 18 + Math.floor(rand() * 14);

  if (kind === 'horizon') {
    const y = 0.55 + rand() * 0.2;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      pts.push({
        x: 0.08 + t * 0.84,
        y: y + Math.sin(t * Math.PI * 2 + rand()) * 0.02,
      });
    }
    return pts;
  }

  if (kind === 'figure') {
    const cx = 0.35 + rand() * 0.3;
    const cy = 0.42 + rand() * 0.1;
    // torso silhouette sketch
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      pts.push({
        x: cx + Math.sin(t * Math.PI) * 0.06 * (t < 0.5 ? 1 : -0.6),
        y: cy + t * 0.38,
      });
    }
    return pts;
  }

  if (kind === 'detail') {
    const x0 = 0.55 + rand() * 0.25;
    const y0 = 0.2 + rand() * 0.25;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      pts.push({
        x: x0 + t * 0.18 + Math.sin(t * 6) * 0.01,
        y: y0 + Math.sin(t * Math.PI) * 0.12,
      });
    }
    return pts;
  }

  // arc / motion trail
  const x0 = 0.1 + rand() * 0.2;
  const y0 = 0.25 + rand() * 0.3;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push({
      x: x0 + t * 0.55,
      y: y0 + Math.sin(t * Math.PI) * (0.12 + rand() * 0.08),
    });
  }
  return pts;
}

function pickKinds(prompt: string): Array<'arc' | 'horizon' | 'figure' | 'detail'> {
  const p = prompt.toLowerCase();
  const kinds: Array<'arc' | 'horizon' | 'figure' | 'detail'> = [];
  if (/run|sprint|figure|person|maya|hero/.test(p)) kinds.push('figure');
  if (/sky|storm|horizon|ridge|land/.test(p)) kinds.push('horizon');
  if (/wind|motion|trail|speed/.test(p)) kinds.push('arc');
  kinds.push('detail');
  if (kinds.length < 2) kinds.push('arc');
  return kinds.slice(0, 3);
}

/**
 * Called after the user finishes a stroke or submits a beat prompt.
 * Returns AI strokes (normalized 0–1 coords) + caption suggestion.
 */
export async function generateAIContribution(
  userInput: {
    prompt?: string;
    lastStroke?: Point[];
    existingStrokeCount: number;
    styleContext?: StyleContext;
  },
): Promise<AIContribution> {
  await delay(420 + Math.random() * 280);

  const seedSource =
    (userInput.prompt ?? '') +
    String(userInput.existingStrokeCount) +
    (userInput.styleContext?.captionTone ?? '');
  const rand = mulberry32(hashSeed(seedSource || 'idle'));

  const prompt = userInput.prompt?.trim() || 'continue the beat';
  const kinds = pickKinds(prompt);

  const strokes = kinds.map((kind) => ({
    author: 'ai' as const,
    points: fakeStroke(rand, kind),
  }));

  const tone = userInput.styleContext?.captionTone || 'tense';
  const vocab = userInput.styleContext?.vocabulary?.[0];
  const captionSuggestion = vocab
    ? `…${vocab} pressed harder against the frame.`
    : tone === 'hopeful'
      ? '…light cracked through the dust.'
      : '…the beat held its breath.';

  return { strokes, captionSuggestion };
}

/**
 * After the user erases/overdraws AI ink, regenerate only the remaining AI layer.
 */
export async function regenerateRemainder(
  remainingStrokes: Stroke[],
  editContext: { removedCount: number; styleContext?: StyleContext },
): Promise<AIContribution> {
  await delay(380 + Math.random() * 220);

  const userCount = remainingStrokes.filter((s) => s.author === 'user').length;
  const rand = mulberry32(
    hashSeed(`remainder-${editContext.removedCount}-${userCount}`),
  );

  // One replacement atmospheric stroke keyed to what survived
  const strokes = [
    {
      author: 'ai' as const,
      points: fakeStroke(rand, editContext.removedCount > 1 ? 'arc' : 'detail'),
    },
  ];

  return {
    strokes,
    captionSuggestion: '', // caption handled separately
  };
}

/**
 * After the user edits inside the AI caption region, return a new continuation
 * that should replace `aiSuggestionText` (appended after committed user text).
 */
export async function regenerateCaption(newUserText: string): Promise<string> {
  await delay(300 + Math.random() * 200);

  const tail = newUserText.trim().slice(-48).toLowerCase();
  if (/storm|pulse|ion/.test(tail)) {
    return ' The ridge fractured in blue static.';
  }
  if (/run|sprint|breath/.test(tail)) {
    return ' Her stride cut the silence thin.';
  }
  if (newUserText.trim().length === 0) {
    return 'A blank beat waits for ink.';
  }
  return ' Something unfinished still moved in the margins.';
}

/** Derive a lightweight style context from prior panels for multi-panel continuity. */
export function deriveStyleContext(panels: { strokes: Stroke[]; caption: { committedText: string; aiSuggestionText: string } }[]): StyleContext {
  const vocabulary: string[] = [];
  const colors = ['#1a1a1a', '#E87B6A']; // ink + accent; mock “dominant” set

  for (const p of panels) {
    const full = `${p.caption.committedText} ${p.caption.aiSuggestionText}`.trim();
    for (const word of full.split(/\s+/)) {
      const w = word.replace(/[^a-zA-Z']/g, '').toLowerCase();
      if (w.length > 4 && !vocabulary.includes(w)) vocabulary.push(w);
      if (vocabulary.length >= 8) break;
    }
  }

  const joined = panels.map((p) => p.caption.committedText).join(' ').toLowerCase();
  let captionTone = 'neutral';
  if (/hope|light|warm|soft/.test(joined)) captionTone = 'hopeful';
  else if (/dark|storm|fear|tense|breath/.test(joined)) captionTone = 'tense';

  return { dominantColors: colors, captionTone, vocabulary };
}

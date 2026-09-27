import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import {
  deriveStyleContext,
  generateAIContribution,
  regenerateCaption,
  regenerateRemainder,
} from './mockAI';
import type { ComicPanel, Point, Stroke, StyleContext } from './types';

const ACCENT = '#E87B6A';
const USER_INK = '#1A1A1A';
const AI_INK = '#5B8DEF';
const SETTLE = { type: 'spring' as const, stiffness: 120, damping: 14 };
const IDLE_MS = 3000;
const PANEL_W = 640;
const PANEL_H = 480; // 4:3

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyPanel(): ComicPanel {
  return {
    id: uid('panel'),
    strokes: [],
    caption: {
      committedText: '',
      aiSuggestionText: '',
      suggestionSettled: false,
    },
  };
}

function pointsToPath(points: Point[], w: number, h: number): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => {
      const x = p.x * w;
      const y = p.y * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

/** True if any point in `a` is within threshold (normalized) of any point in `b`. */
function strokesOverlap(a: Point[], b: Point[], threshold = 0.045): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const t2 = threshold * threshold;
  for (const p of a) {
    for (const q of b) {
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      if (dx * dx + dy * dy <= t2) return true;
    }
  }
  return false;
}

function StrokePath({
  stroke,
  width,
  height,
}: {
  stroke: Stroke;
  width: number;
  height: number;
}) {
  const isAi = stroke.author === 'ai';
  const settled = !isAi || stroke.settled;
  const d = pointsToPath(stroke.points, width, height);

  return (
    <motion.path
      d={d}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={isAi ? 2.4 : 2.8}
      initial={isAi ? { opacity: 0.4, pathLength: 0.85 } : false}
      animate={{
        opacity: settled ? 1 : 0.4,
        pathLength: 1,
      }}
      transition={SETTLE}
      style={{
        stroke: settled && isAi ? USER_INK : isAi ? AI_INK : USER_INK,
      }}
    />
  );
}

export const ComicPanelEditor: React.FC = () => {
  const [panels, setPanels] = useState<ComicPanel[]>(() => [emptyPanel()]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [livePoints, setLivePoints] = useState<Point[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastInteractionAt, setLastInteractionAt] = useState(() => Date.now());

  const svgRef = useRef<SVGSVGElement>(null);
  const drawingRef = useRef(false);
  const liveRef = useRef<Point[]>([]);
  const requestIdRef = useRef(0);
  const captionTimerRef = useRef<number | null>(null);

  const active = panels[activeIndex] ?? panels[0];
  const styleContext: StyleContext = useMemo(
    () => deriveStyleContext(panels.slice(0, activeIndex + 1)),
    [panels, activeIndex],
  );

  const bumpInteraction = useCallback(() => {
    setLastInteractionAt(Date.now());
  }, []);

  const updateActive = useCallback(
    (fn: (panel: ComicPanel) => ComicPanel) => {
      setPanels((prev) =>
        prev.map((p, i) => (i === activeIndex ? fn(p) : p)),
      );
    },
    [activeIndex],
  );

  const clientToNorm = useCallback((clientX: number, clientY: number): Point | null => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }, []);

  // ── Settle idle AI contributions after 3s ──
  useEffect(() => {
    const hasUnsettled =
      active.strokes.some((s) => s.author === 'ai' && !s.settled) ||
      (!!active.caption.aiSuggestionText && !active.caption.suggestionSettled);

    if (!hasUnsettled) return;

    const remaining = IDLE_MS - (Date.now() - lastInteractionAt);
    const t = window.setTimeout(() => {
      updateActive((panel) => ({
        ...panel,
        strokes: panel.strokes.map((s) =>
          s.author === 'ai' ? { ...s, settled: true } : s,
        ),
        caption: {
          ...panel.caption,
          suggestionSettled: panel.caption.aiSuggestionText
            ? true
            : panel.caption.suggestionSettled,
        },
      }));
    }, Math.max(0, remaining));

    return () => window.clearTimeout(t);
  }, [active, lastInteractionAt, updateActive]);

  const applyAIContribution = useCallback(
    async (
      contribution: Awaited<ReturnType<typeof generateAIContribution>>,
      opts?: { replaceAiStrokes?: boolean; setCaption?: boolean },
    ) => {
      const replaceAi = opts?.replaceAiStrokes ?? false;
      const setCaption = opts?.setCaption ?? true;

      updateActive((panel) => {
        const kept = replaceAi
          ? panel.strokes.filter((s) => s.author === 'user')
          : panel.strokes;

        const newAi: Stroke[] = contribution.strokes.map((s) => ({
          id: uid('ai'),
          author: 'ai',
          points: s.points,
          settled: false,
        }));

        let caption = panel.caption;
        if (setCaption && contribution.captionSuggestion) {
          caption = {
            ...panel.caption,
            aiSuggestionText: contribution.captionSuggestion,
            suggestionSettled: false,
          };
        }

        return { ...panel, strokes: [...kept, ...newAi], caption };
      });
      bumpInteraction();
    },
    [bumpInteraction, updateActive],
  );

  const requestAIFromStroke = useCallback(
    async (lastStroke: Point[]) => {
      const req = ++requestIdRef.current;
      setBusy(true);
      try {
        const contribution = await generateAIContribution({
          lastStroke,
          existingStrokeCount: active.strokes.length + 1,
          styleContext,
          prompt: prompt || undefined,
        });
        if (req !== requestIdRef.current) return;
        await applyAIContribution(contribution, { setCaption: !active.caption.aiSuggestionText });
      } finally {
        if (req === requestIdRef.current) setBusy(false);
      }
    },
    [active.caption.aiSuggestionText, active.strokes.length, applyAIContribution, prompt, styleContext],
  );

  const handleStrokeComplete = useCallback(
    async (points: Point[]) => {
      if (points.length < 2) return;
      bumpInteraction();

      const userStroke: Stroke = {
        id: uid('user'),
        author: 'user',
        points,
        settled: true,
      };

      // Detect overlap with AI strokes → remove + regenerate remainder
      const overlapping = active.strokes.filter(
        (s) => s.author === 'ai' && strokesOverlap(points, s.points),
      );

      if (overlapping.length > 0) {
        const overlapIds = new Set(overlapping.map((s) => s.id));
        const remaining = [...active.strokes.filter((s) => !overlapIds.has(s.id)), userStroke];

        updateActive((panel) => ({
          ...panel,
          strokes: remaining,
        }));

        const req = ++requestIdRef.current;
        setBusy(true);
        try {
          const contrib = await regenerateRemainder(remaining, {
            removedCount: overlapping.length,
            styleContext,
          });
          if (req !== requestIdRef.current) return;
          await applyAIContribution(contrib, {
            replaceAiStrokes: false,
            setCaption: false,
          });
        } finally {
          if (req === requestIdRef.current) setBusy(false);
        }
        return;
      }

      updateActive((panel) => ({
        ...panel,
        strokes: [...panel.strokes, userStroke],
      }));

      await requestAIFromStroke(points);
    },
    [
      active.strokes,
      applyAIContribution,
      bumpInteraction,
      requestAIFromStroke,
      styleContext,
      updateActive,
    ],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = clientToNorm(e.clientX, e.clientY);
    if (!pt) return;
    drawingRef.current = true;
    liveRef.current = [pt];
    setLivePoints([pt]);
    setIsDrawing(true);
    bumpInteraction();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const pt = clientToNorm(e.clientX, e.clientY);
    if (!pt) return;
    const next = [...liveRef.current, pt];
    liveRef.current = next;
    setLivePoints(next);
  };

  const endStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setIsDrawing(false);
    const pts = liveRef.current;
    liveRef.current = [];
    setLivePoints([]);
    void handleStrokeComplete(pts);
  };

  const submitPrompt = async () => {
    const text = prompt.trim();
    if (!text) return;
    bumpInteraction();
    const req = ++requestIdRef.current;
    setBusy(true);
    try {
      const contribution = await generateAIContribution({
        prompt: text,
        existingStrokeCount: active.strokes.length,
        styleContext,
      });
      if (req !== requestIdRef.current) return;
      await applyAIContribution(contribution);
      setPrompt('');
    } finally {
      if (req === requestIdRef.current) setBusy(false);
    }
  };

  const onCaptionChange = (value: string) => {
    bumpInteraction();
    const hadSuggestion = !!active.caption.aiSuggestionText;

    updateActive((panel) => ({
      ...panel,
      caption: {
        committedText: value,
        aiSuggestionText: hadSuggestion ? '' : panel.caption.aiSuggestionText,
        suggestionSettled: hadSuggestion ? false : panel.caption.suggestionSettled,
      },
    }));

    if (!hadSuggestion) return;

    if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
    captionTimerRef.current = window.setTimeout(() => {
      const req = ++requestIdRef.current;
      setBusy(true);
      void (async () => {
        try {
          const next = await regenerateCaption(value);
          if (req !== requestIdRef.current) return;
          updateActive((panel) => ({
            ...panel,
            caption: {
              committedText: value,
              aiSuggestionText: next,
              suggestionSettled: false,
            },
          }));
          bumpInteraction();
        } finally {
          if (req === requestIdRef.current) setBusy(false);
        }
      })();
    }, 450);
  };

  const addPanel = () => {
    setPanels((prev) => [...prev, emptyPanel()]);
    setActiveIndex(panels.length);
    bumpInteraction();
  };

  const captionSettled = active.caption.suggestionSettled;

  return (
    <div className="min-h-screen w-full bg-[#FAF9F7] text-[#1A1A1A] flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-[720px] flex flex-col gap-5">
        {/* Minimal panel tabs + new */}
        <div className="flex items-center gap-2 flex-wrap">
          {panels.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setActiveIndex(i);
                bumpInteraction();
              }}
              className="h-8 px-3 text-xs font-medium rounded-lg border-2 transition-colors"
              style={{
                borderColor: i === activeIndex ? ACCENT : '#E5E2DE',
                color: i === activeIndex ? ACCENT : '#6B7280',
                background: i === activeIndex ? `${ACCENT}14` : 'transparent',
              }}
            >
              Panel {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={addPanel}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border-2 border-dashed border-[#E5E2DE] text-[#9CA3AF] hover:border-[#E87B6A] hover:text-[#E87B6A] transition-colors"
            title="New panel"
            aria-label="New panel"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
          </button>
          {busy && (
            <span className="ml-auto text-[11px] tracking-wide text-[#9CA3AF]">
              AI drafting…
            </span>
          )}
        </div>

        {/* Canvas panel 4:3 */}
        <div
          className="relative bg-white overflow-hidden select-none touch-none"
          style={{
            width: '100%',
            maxWidth: PANEL_W,
            aspectRatio: '4 / 3',
            border: '2px solid #1A1A1A',
            borderRadius: 8,
            outline: isDrawing ? `2px solid ${ACCENT}` : undefined,
            outlineOffset: 2,
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onPointerLeave={() => {
              if (drawingRef.current) endStroke();
            }}
          >
            <rect width={PANEL_W} height={PANEL_H} fill="#FFFEFC" />
            {active.strokes.map((stroke) => (
              <StrokePath
                key={stroke.id}
                stroke={stroke}
                width={PANEL_W}
                height={PANEL_H}
              />
            ))}
            {livePoints.length > 1 && (
              <path
                d={pointsToPath(livePoints, PANEL_W, PANEL_H)}
                fill="none"
                stroke={USER_INK}
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>

        {/* Caption: committed + dimmed AI suggestion */}
        <div
          className="rounded-lg border-2 bg-white overflow-hidden focus-within:border-[#E87B6A] transition-colors"
          style={{ borderColor: '#E5E2DE' }}
        >
          <div className="px-3 pt-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#9CA3AF]">
              Caption
            </span>
          </div>
          <div className="relative px-3 pb-3 pt-1">
            <textarea
              value={active.caption.committedText}
              onChange={(e) => onCaptionChange(e.target.value)}
              rows={2}
              placeholder="Write the panel caption…"
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-[#D1D5DB]"
            />
            <AnimatePresence mode="wait">
              {active.caption.aiSuggestionText ? (
                <motion.p
                  key={active.caption.aiSuggestionText}
                  initial={{ opacity: 0.35 }}
                  animate={{
                    opacity: captionSettled ? 1 : 0.45,
                    color: captionSettled ? USER_INK : '#9CA3AF',
                  }}
                  exit={{ opacity: 0 }}
                  transition={SETTLE}
                  className={`text-[15px] leading-relaxed -mt-1 ${
                    captionSettled ? 'not-italic' : 'italic'
                  }`}
                >
                  {active.caption.aiSuggestionText}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Beat prompt — minimal, not a toolbar */}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submitPrompt();
          }}
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              bumpInteraction();
            }}
            placeholder="Describe the beat…"
            className="flex-1 h-10 px-3 text-sm rounded-lg border-2 border-[#E5E2DE] bg-white outline-none focus:border-[#E87B6A] transition-colors"
          />
          <button
            type="submit"
            disabled={busy || !prompt.trim()}
            className="h-10 px-4 text-sm font-medium rounded-lg text-white disabled:opacity-40 transition-opacity"
            style={{ background: ACCENT }}
          >
            Contribute
          </button>
        </form>

        <p className="text-[11px] text-[#A8A29E] leading-relaxed">
          Draw freely on the panel. After each stroke—or a beat description—AI ink and caption
          text arrive dimmed. Pause 3s to settle. Overdrawing AI strokes or editing the suggestion
          triggers a mock regenerate. New panels carry style context from prior ones.
        </p>
      </div>
    </div>
  );
};

export default ComicPanelEditor;

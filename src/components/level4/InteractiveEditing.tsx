import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eraser, Mic, Paintbrush, PenTool, Sparkles } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;
type Tool = 'pen' | 'inker' | 'eraser';

const PLATE_W = 1280;
const PLATE_H = 720;

const HUMAN = '#0F1115';
const GHOST = '#4F46E5';
const GUIDE = '#818CF8';

const PANELS = [
  { id: 1, code: 'P01', title: 'LOCK', state: 'committed' as const },
  { id: 2, code: 'P02', title: 'ALARM', state: 'committed' as const },
  { id: 3, code: 'P03', title: 'BREACH', state: 'committed' as const },
  { id: 4, code: 'P04', title: 'CO-AUTH', state: 'active' as const },
  { id: 5, code: 'P05', title: 'EXT', state: 'empty' as const },
];

/** Anatomical sprint figure — Dr. Maya Lin, hooded tactical tech-parka, goggles, forward lean. */
function MayaLinFigure({ drawKey }: { drawKey: number }) {
  const draw = (d: string, w: number, delay: number, opacity = 1) => (
    <motion.path
      d={d}
      strokeWidth={w}
      opacity={opacity}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.75, delay, ease: 'easeOut' }}
    />
  );

  return (
    <g
      key={drawKey}
      stroke={HUMAN}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Cranium + jaw — 3/4 forward lean */}
      {draw(
        `M 604 132
         C 588 118 592 96 612 88
         C 636 78 662 92 666 116
         C 670 138 656 156 636 162
         C 620 166 610 152 604 132 Z`,
        3.4,
        0,
      )}
      {/* Protective goggles — dual lenses + strap */}
      {draw(
        `M 600 128 C 604 118 622 116 632 126 C 624 138 608 138 600 128 Z
         M 638 126 C 646 116 666 118 672 130 C 662 142 646 138 638 126 Z
         M 632 128 L 638 128
         M 598 130 C 580 128 572 136 576 148
         M 674 130 C 690 128 698 138 694 150`,
        2.3,
        0.1,
      )}
      {/* Lens speculars */}
      {draw(`M 610 124 L 620 122 M 648 124 L 658 126`, 1.5, 0.18, 0.75)}
      {/* Neck + hood collar / respirator yoke */}
      {draw(
        `M 628 160 L 622 178
         M 600 172
         C 578 182 568 198 574 218
         C 610 210 668 214 702 232
         C 708 210 692 188 668 178
         C 648 170 622 168 600 172 Z`,
        3.2,
        0.12,
      )}
      {/* Shoulders / deltoid mass under parka */}
      {draw(
        `M 548 228
         C 530 236 522 252 528 268
         M 698 236
         C 722 242 738 258 742 278`,
        3.6,
        0.16,
      )}
      {/* Torso block — ribcage to pelvis, forward pitch */}
      {draw(
        `M 556 220
         C 512 258 492 312 488 368
         C 486 402 512 428 556 436
         C 604 446 656 432 676 392
         C 702 340 694 278 668 236
         C 650 216 602 208 556 220 Z`,
        4.4,
        0.18,
      )}
      {/* Parka construction: zipper, storm flap, pack straps */}
      {draw(
        `M 602 226 L 578 428
         M 534 274 L 640 286
         M 524 332 L 650 346
         M 568 248 C 556 266 560 292 572 308
         M 620 252 C 640 268 648 292 642 316`,
        2.1,
        0.28,
        0.88,
      )}
      {/* Wind-torn hem & hood fabric streams */}
      {draw(
        `M 678 258 C 710 246 742 254 758 278 C 736 286 706 276 684 270
         M 668 318 C 704 308 736 328 752 352 C 724 356 690 340 672 332
         M 690 200 C 718 188 744 198 754 218`,
        2.7,
        0.3,
      )}
      {/* Lead arm — scapula to forearm to gloved fist */}
      {draw(
        `M 658 248
         C 698 228 748 224 782 252
         C 800 268 796 294 774 308
         C 748 326 710 318 682 298
         M 776 278
         C 792 284 802 300 790 314
         C 776 322 760 312 764 296`,
        3.9,
        0.22,
      )}
      {/* Trail arm — elbow lock, trailing glove */}
      {draw(
        `M 534 258
         C 492 282 458 328 442 378
         C 434 404 452 422 474 416
         C 502 408 522 376 532 348
         M 448 388 C 436 396 438 412 452 416`,
        3.7,
        0.24,
      )}
      {/* Pelvis / hip hinge */}
      {draw(
        `M 548 420 C 572 412 612 414 640 426
         M 560 432 L 548 448 M 620 434 L 636 450`,
        2.8,
        0.32,
        0.8,
      )}
      {/* Lead leg — quads, knee, shin, boot */}
      {draw(
        `M 556 436
         C 512 468 472 516 452 568
         C 442 594 436 622 450 640
         C 466 660 496 652 512 630
         C 536 598 560 556 578 520
         M 468 582 C 480 574 496 578 504 592`,
        4.5,
        0.34,
      )}
      {/* Trail leg — hamstring kick, pointed boot */}
      {draw(
        `M 612 438
         C 658 462 708 492 748 536
         C 774 560 802 592 818 624
         C 828 644 814 660 792 654
         C 756 642 724 608 698 576
         C 666 536 636 496 618 464
         M 760 600 C 772 592 788 598 794 612`,
        4.3,
        0.38,
      )}
      {/* Boot soles */}
      {draw(`M 444 638 L 520 652 M 784 652 L 842 636`, 5.2, 0.5)}
    </g>
  );
}

/** Step 2–3: AI ghost wind / storm / perspective guides at 35% indigo. */
function AiGhostStorm() {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.35 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Ink-wash storm mass */}
      <path
        d="M 40 40 L 1240 40 L 1240 220
           Q 980 300 720 210 T 40 280 Z"
        fill={GHOST}
        stroke="none"
        opacity={0.45}
      />
      <path
        d="M 40 40 L 1240 40 L 1240 150
           Q 860 240 480 140 Z"
        fill={GHOST}
        stroke="none"
        opacity={0.55}
      />

      {/* Dashed perspective / composition guides */}
      <g stroke={GUIDE} strokeWidth={1.5} strokeDasharray="8 7" fill="none">
        <motion.line
          x1={80}
          y1={80}
          x2={520}
          y2={360}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: 0.1 }}
        />
        <motion.line
          x1={1200}
          y1={70}
          x2={780}
          y2={340}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: 0.15 }}
        />
        <motion.line
          x1={640}
          y1={60}
          x2={640}
          y2={420}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        />
        <motion.path
          d="M 100 520 L 1180 520"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        />
      </g>

      {/* Wind vectors */}
      <g stroke={GHOST} strokeWidth={2.8} strokeLinecap="round" strokeDasharray="10 8" fill="none">
        {[
          [120, 280, 420, 268],
          [90, 320, 400, 308],
          [140, 360, 430, 348],
          [160, 400, 440, 386],
          [200, 440, 460, 426],
        ].map(([x1, y1, x2, y2], i) => (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, delay: 0.3 + i * 0.05 }}
          />
        ))}
      </g>

      {/* Storm plume curls */}
      <g stroke={GHOST} strokeWidth={2.4} fill="none" strokeDasharray="6 6">
        <motion.path
          d="M 860 480 C 880 420 850 370 890 320 C 920 280 900 240 920 200"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, delay: 0.2 }}
        />
        <motion.path
          d="M 940 500 C 970 440 940 390 980 350 C 1010 320 990 280 1010 250"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.05, delay: 0.28 }}
        />
      </g>
    </motion.g>
  );
}

/** Step 3–4: jagged lightning / ion pulse vectors (human override). */
function LightningVectors({ committed }: { committed: boolean }) {
  const stroke = committed ? HUMAN : HUMAN;
  return (
    <motion.g
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.path
        d="M 780 48
           L 742 148
           L 778 162
           L 718 278
           L 756 294
           L 690 420
           L 724 438
           L 668 560"
        strokeWidth={committed ? 4.5 : 4.2}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <motion.path
        d="M 742 148 L 798 128 L 776 168
           M 718 278 L 768 252
           M 690 420 L 742 398"
        strokeWidth={2.8}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      />
      <motion.path
        d="M 860 60 L 840 130 L 870 142 L 820 230"
        strokeWidth={3}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      />
    </motion.g>
  );
}

/** Step 4: AI reworks storm into high-contrast chiaroscuro ink cuts. */
function CommittedChiaroscuro() {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.65 }}
      stroke={HUMAN}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Heavy ink-wash silhouette framing lightning */}
      <motion.path
        d="M 40 40 L 1240 40 L 1240 280
           L 980 160 L 860 250 L 720 130
           L 580 260 L 420 150 L 280 270 L 40 220 Z"
        fill={HUMAN}
        stroke="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      />
      {/* Negative-space ridge cuts */}
      <motion.path
        d="M 720 130 L 780 48 L 820 140 L 860 250 L 920 180 L 980 160"
        strokeWidth={3.5}
        stroke="#F4F4F5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.15 }}
      />
      {/* Solid kinetic trails */}
      <g strokeWidth={3.8}>
        <motion.line x1={120} y1={280} x2={420} y2={268} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.25 }} />
        <motion.line x1={90} y1={320} x2={400} y2={308} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.28 }} />
        <motion.line x1={140} y1={360} x2={430} y2={348} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.31 }} />
        <motion.line x1={160} y1={400} x2={440} y2={386} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.34 }} />
      </g>
      {/* Ridge shatter fragments */}
      {[
        'M 900 400 L 940 360 L 920 420 L 970 390',
        'M 980 440 L 1020 400 L 1000 470 L 1050 430',
        'M 860 460 L 900 430 L 880 500',
      ].map((d, i) => (
        <motion.path
          key={d}
          d={d}
          strokeWidth={2.6}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.35 + i * 0.06 }}
        />
      ))}
    </motion.g>
  );
}

function CropMarks() {
  const s = 18;
  const t = 1.25;
  const c = '#64748B';
  const corners: Array<[number, number, number, number]> = [
    [0, 0, 1, 1],
    [PLATE_W, 0, -1, 1],
    [0, PLATE_H, 1, -1],
    [PLATE_W, PLATE_H, -1, -1],
  ];
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${PLATE_W} ${PLATE_H}`}
      aria-hidden
    >
      {corners.map(([x, y, dx, dy], i) => (
        <g key={i} stroke={c} strokeWidth={t} fill="none">
          <line x1={x} y1={y + dy * s} x2={x} y2={y} />
          <line x1={x + dx * s} y1={y} x2={x} y2={y} />
        </g>
      ))}
    </svg>
  );
}

function WaveMeter({ active }: { active: boolean }) {
  const bars = useMemo(() => [5, 11, 7, 14, 9, 13, 6, 12, 8, 15, 7, 10], []);
  return (
    <div className="flex items-end gap-[2px] h-3.5">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className={`w-[2px] ${active ? 'bg-amber-500/90' : 'bg-[#3A3F4A]'}`}
          animate={
            active
              ? { height: [h * 0.4, h, h * 0.55, h * 0.85, h * 0.35] }
              : { height: 3 }
          }
          transition={
            active
              ? { duration: 0.85 + (i % 3) * 0.06, repeat: Infinity, ease: 'easeInOut', delay: i * 0.03 }
              : { duration: 0.2 }
          }
          style={{ height: 3 }}
        />
      ))}
    </div>
  );
}

function FilmstripThumb({
  panel,
  active,
  committed,
}: {
  panel: (typeof PANELS)[number];
  active: boolean;
  committed: boolean;
}) {
  const isEmpty = panel.state === 'empty';
  return (
    <div
      className={`relative shrink-0 w-[96px] h-[54px] ${
        isEmpty
          ? 'border border-dashed border-[#3A3F4A] bg-transparent'
          : active
            ? 'border-[1.5px] border-amber-400 bg-[#0F1115] ring-1 ring-white/20'
            : 'border border-[#2E323B] bg-[#0F1115]'
      }`}
    >
      {!isEmpty && (
        <svg viewBox="0 0 96 54" className="absolute inset-0 w-full h-full opacity-40">
          <rect x="0" y="0" width="96" height="54" fill="#0F1115" />
          {committed || panel.state === 'committed' ? (
            <>
              <path d="M8 40 L30 22 L48 34 L70 14 L88 28 L88 54 L8 54 Z" fill="#2E323B" />
              <circle cx="28" cy="28" r="4" fill="#3A3F4A" />
            </>
          ) : (
            <path d="M20 36 L40 20 L55 30 L75 16" stroke="#3A3F4A" strokeWidth="1.5" fill="none" />
          )}
        </svg>
      )}
      <div className="absolute inset-0 flex flex-col justify-between p-1">
        <span className="font-mono-tech text-[9px] tracking-wider text-[#94A3B8]">{panel.code}</span>
        <span className="font-mono-tech text-[8px] uppercase tracking-widest text-[#64748B]">
          {committed && panel.id === 4 ? 'COMMIT' : panel.title}
        </span>
      </div>
      {active && !committed && (
        <span className="absolute top-1 right-1 w-1 h-1 bg-amber-400" />
      )}
      {committed && panel.id === 4 && (
        <Check className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-emerald-500" strokeWidth={2.5} />
      )}
    </div>
  );
}

export const InteractiveEditing: React.FC = () => {
  const [step, setStep] = useState<Step>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [drawKey, setDrawKey] = useState(0);
  const [viewportScale, setViewportScale] = useState(1);
  const autoGenRef = useRef(0);

  const highlightedTool: Tool = step === 3 ? 'pen' : activeTool;

  useEffect(() => {
    const update = () => {
      const sx = window.innerWidth / 1920;
      const sy = window.innerHeight / 1080;
      setViewportScale(Math.min(1, sx, sy));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 1.5s stylus-lift → Step 2 (manual mode)
  useEffect(() => {
    if (step !== 1 || isAutoPlaying) return;
    const t = window.setTimeout(() => setStep(2), 1500);
    return () => window.clearTimeout(t);
  }, [step, isAutoPlaying]);

  const goToStep = useCallback((s: Step) => {
    autoGenRef.current += 1;
    setIsAutoPlaying(false);
    if (s === 1) setDrawKey((k) => k + 1);
    setStep(s);
  }, []);

  const startAutoRun = useCallback(() => {
    const gen = ++autoGenRef.current;
    setIsAutoPlaying(true);
    setDrawKey((k) => k + 1);
    setStep(1);

    const at = (next: Step, ms: number) => {
      window.setTimeout(() => {
        if (autoGenRef.current !== gen) return;
        setStep(next);
        if (next === 4) {
          window.setTimeout(() => {
            if (autoGenRef.current !== gen) return;
            setIsAutoPlaying(false);
          }, 2200);
        }
      }, ms);
    };

    at(2, 2000);
    at(3, 2000 + 2800);
    at(4, 2000 + 2800 + 2600);
  }, []);

  const modeStatus = useMemo(() => {
    switch (step) {
      case 1:
        return (
          <span className="font-mono-tech text-[10px] tracking-widest text-[#64748B]">[STBY]</span>
        );
      case 2:
        return (
          <span className="font-mono-tech text-[10px] tracking-widest text-indigo-400 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" strokeWidth={1.75} />
            [✦ AI INGRESS 35%]
          </span>
        );
      case 3:
        return (
          <span className="font-mono-tech text-[10px] tracking-widest text-amber-400">
            [OVERRIDE DETECTED]
          </span>
        );
      case 4:
        return (
          <span className="font-mono-tech text-[10px] tracking-widest text-emerald-500 inline-flex items-center gap-1">
            <Check className="w-3 h-3" strokeWidth={2.5} />
            [✓ COMMITTED]
          </span>
        );
    }
  }, [step]);

  const transcript =
    step <= 2
      ? `"Maya's running, storm closing in"`
      : step === 3
        ? `"override — re-reading plate"`
        : `"plate converged — co-authored"`;

  return (
    <div className="w-screen h-screen flex items-start justify-center overflow-hidden bg-[#121316]">
    <div
      className="w-[1920px] h-[1080px] flex flex-col bg-[#121316] text-[#E2E8F0] origin-top"
      style={{
        transform: `scale(${viewportScale})`,
        marginBottom: viewportScale < 1 ? `${(viewportScale - 1) * 1080}px` : undefined,
      }}
    >
      {/* ── Top Studio Header (44px) ── */}
      <header className="h-[44px] shrink-0 flex items-center justify-between px-4 border-b border-[#2E323B] bg-[#1A1D23]">
        <div className="flex items-center gap-3 font-mono-tech text-[11px] tracking-wide text-[#94A3B8] min-w-0">
          <span className="text-[#E2E8F0] font-semibold tracking-wider shrink-0">
            PROJECT: CHRONO-BREACH // ACT II
          </span>
          <span className="text-[#3A3F4A]">|</span>
          <span className="shrink-0">Scene: SC_04</span>
          <span className="text-[#3A3F4A]">•</span>
          <span className="shrink-0">Frame: 0144</span>
          <span className="text-[#3A3F4A]">•</span>
          <span className="shrink-0">Lens: 35mm Anamorphic</span>
          <span className="text-[#3A3F4A]">•</span>
          <span className="text-amber-500/90 shrink-0">TC: 00:04:12:08</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono-tech text-[10px] tracking-widest text-[#64748B]">[REC STBY]</span>
          <span className="font-mono-tech text-[10px] tracking-widest text-[#64748B]">
            [STYLE: GRAPHIC INK]
          </span>
          <div className="flex items-center border border-[#2E323B]">
            {([1, 2, 3, 4] as Step[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => goToStep(s)}
                className={`font-mono-tech w-7 h-7 text-[11px] transition-colors ${
                  step === s
                    ? 'bg-[#2E323B] text-amber-400'
                    : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#121316]'
                }`}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={startAutoRun}
              className={`font-mono-tech h-7 px-2 text-[10px] tracking-wider border-l border-[#2E323B] transition-colors ${
                isAutoPlaying
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#121316]'
              }`}
            >
              {isAutoPlaying ? '…' : 'AUTO'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Sequence Strip (72px) ── */}
      <div className="h-[72px] shrink-0 flex items-center gap-3 px-4 border-b border-[#2E323B] bg-[#16181D]">
        <span className="font-mono-tech text-[9px] tracking-[0.2em] text-[#64748B] uppercase shrink-0">
          SEQ
        </span>
        <div className="flex items-center gap-2">
          {PANELS.map((p, i) => (
            <React.Fragment key={p.id}>
              {i > 0 && <div className="w-3 h-px bg-[#2E323B]" />}
              <FilmstripThumb
                panel={p}
                active={p.state === 'active'}
                committed={step === 4 && p.id === 4}
              />
            </React.Fragment>
          ))}
        </div>
        <div className="ml-auto font-mono-tech text-[10px] tracking-wider text-[#64748B]">
          {step === 4 ? (
            <span className="text-emerald-500">P04 · COMMITTED CO-AUTH</span>
          ) : step >= 2 ? (
            <span>P04 · ACTIVE PLATE · AI INGRESS</span>
          ) : (
            <span>P04 · HUMAN MARK IN PROGRESS</span>
          )}
        </div>
      </div>

      {/* ── Stage Well ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0 py-3 bg-[#121316]">
        {/* Active Plate 1280×720 */}
        <div
          className="relative shrink-0 border border-[#2E323B] shadow-[0_0_0_1px_#0F1115]"
          style={{ width: PLATE_W, height: PLATE_H, background: '#F4F4F5' }}
        >
          <CropMarks />

          {/* Layer / Authorship HUD */}
          <div className="absolute top-3 right-3 z-20 w-[220px] bg-[#1A1D23]/92 border border-[#2E323B] backdrop-blur-sm p-2.5">
            <div className="font-mono-tech text-[9px] tracking-[0.18em] text-[#64748B] uppercase mb-2">
              Layer Legend
            </div>
            <ul className="space-y-1.5 font-mono-tech text-[10px] text-[#94A3B8]">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F1115] border border-[#2E323B]" />
                Human Charcoal · 100%
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full border border-indigo-500/80 bg-indigo-500/35" />
                AI Ghost Ingress · 35%
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 border-t border-dashed border-[#818CF8]" />
                Comp Vector · Dashed
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#0F1115]" />
                Committed Co-Auth Ink
              </li>
            </ul>
            {step === 2 && (
              <div className="mt-2 pt-2 border-t border-[#2E323B] font-mono-tech text-[9px] text-indigo-400 tracking-wider">
                ✦ GHOST LAYER ACTIVE
              </div>
            )}
            {step === 3 && (
              <div className="mt-2 pt-2 border-t border-[#2E323B] font-mono-tech text-[9px] text-amber-400 tracking-wider">
                ⚡ HUMAN OVERRIDE
              </div>
            )}
            {step === 4 && (
              <div className="mt-2 pt-2 border-t border-[#2E323B] font-mono-tech text-[9px] text-emerald-500 tracking-wider">
                ✓ PLATE COMMITTED
              </div>
            )}
          </div>

          {/* Drawing surface */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${PLATE_W} ${PLATE_H}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Subtle board tooth */}
            <defs>
              <pattern id="board-tooth" width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.35" fill="#0F1115" opacity="0.04" />
              </pattern>
            </defs>
            <rect width={PLATE_W} height={PLATE_H} fill="url(#board-tooth)" />

            <AnimatePresence mode="wait">
              {(step === 2 || step === 3) && <AiGhostStorm key="ghost" />}
              {step === 4 && <CommittedChiaroscuro key="ink" />}
            </AnimatePresence>

            <MayaLinFigure drawKey={drawKey} />

            <AnimatePresence>
              {(step === 3 || step === 4) && (
                <LightningVectors key="bolt" committed={step === 4} />
              )}
            </AnimatePresence>
          </svg>

          {/* Dialogue / Action Ledger — plate baseline */}
          <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-[#2E323B]/40 bg-[#F4F4F5]/95">
            <div className="px-4 py-2.5">
              <div className="font-mono-tech text-[9px] tracking-[0.2em] text-[#64748B] uppercase mb-1">
                ACTION / BEAT [SC_04_B02]
              </div>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.p
                    key="c1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono-tech text-[12px] text-[#94A3B8]"
                  >
                    Awaiting audio transcription…
                  </motion.p>
                )}
                {step === 2 && (
                  <motion.div
                    key="c2"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="border border-dashed border-indigo-400/60 bg-white/60 px-3 py-2"
                  >
                    <p className="text-[13px] italic text-[#334155] font-serif leading-snug">
                      &ldquo;Maya&apos;s respirators seized, but the{' '}
                      <span className="bg-indigo-100/80 text-indigo-900 px-0.5">toxic squall</span>{' '}
                      behind her gave no quarter.&rdquo;
                    </p>
                    <span className="font-mono-tech text-[9px] tracking-wider text-indigo-500 mt-1 inline-block">
                      AI GHOST DRAFT
                    </span>
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div
                    key="c3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border border-amber-500/50 bg-white px-3 py-2"
                  >
                    <p className="text-[13px] italic text-[#1E293B] font-serif leading-snug">
                      &ldquo;Maya&apos;s respirators seized, but the{' '}
                      <span className="line-through decoration-red-500 decoration-2 text-red-400">
                        toxic squall
                      </span>{' '}
                      <span className="text-teal-600 not-italic font-semibold underline decoration-teal-500/70">
                        ion pulse storm
                      </span>{' '}
                      behind her gave no quarter.&rdquo;
                    </p>
                    <span className="font-mono-tech text-[9px] tracking-wider text-amber-600 mt-1 inline-block">
                      HUMAN EDIT · INLINE
                    </span>
                  </motion.div>
                )}
                {step === 4 && (
                  <motion.div
                    key="c4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-[#2E323B] bg-white px-3 py-2"
                  >
                    <p className="text-[13px] font-medium text-[#0F1115] leading-snug">
                      &ldquo;Maya&apos;s respirators seized, but the ion pulse storm shattered the ridge
                      behind her.&rdquo;
                    </p>
                    <span className="font-mono-tech text-[9px] tracking-wider text-emerald-700 mt-1 inline-flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                      COMMITTED LINE
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Floating Studio Tool Dock (40px) */}
        <div
          className="h-10 shrink-0 flex items-center gap-3 px-3 border border-[#2E323B] bg-[#1A1D23]"
          style={{ width: Math.min(PLATE_W, 720) }}
        >
          <div className="flex items-center gap-0.5">
            {(
              [
                { id: 'pen' as Tool, Icon: PenTool, tip: 'Pen' },
                { id: 'inker' as Tool, Icon: Paintbrush, tip: 'Sable Inker' },
                { id: 'eraser' as Tool, Icon: Eraser, tip: 'Razor Eraser' },
              ] as const
            ).map(({ id, Icon, tip }) => (
              <button
                key={id}
                type="button"
                title={tip}
                onClick={() => setActiveTool(id)}
                className={`w-8 h-8 flex items-center justify-center transition-colors ${
                  highlightedTool === id
                    ? 'bg-[#2E323B] text-amber-400'
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-[#2E323B]" />

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className={`w-6 h-6 flex items-center justify-center shrink-0 ${
                step === 1 ? 'bg-amber-500/20 text-amber-400' : 'text-[#3A3F4A]'
              }`}
            >
              <Mic className={`w-3 h-3 ${step === 1 ? 'animate-pulse' : ''}`} strokeWidth={1.75} />
            </div>
            <WaveMeter active={step === 1 || step === 2} />
            <span className="font-mono-tech text-[10px] text-[#94A3B8] truncate tracking-tight">
              {transcript}
            </span>
          </div>

          <div className="w-px h-5 bg-[#2E323B]" />

          <div className="shrink-0 pr-1">{modeStatus}</div>
        </div>
      </div>

      {/* Status footer strip */}
      <footer className="h-6 shrink-0 flex items-center justify-between px-4 border-t border-[#2E323B] bg-[#1A1D23] font-mono-tech text-[9px] tracking-wider text-[#64748B]">
        <span>LEVEL 4 · CO-CREATION & PRESENCE · INTERACTIVE EDITING</span>
        <span>
          PLATE {PLATE_W}×{PLATE_H} · 16:9 · GRAPHIC NOVEL DRAFT
        </span>
      </footer>
    </div>
    </div>
  );
};

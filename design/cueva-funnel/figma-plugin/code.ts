// CUEVA — Landing page builder
// Draws the Cueva funnel landing page onto the Figma canvas as native
// auto-layout frames and real text layers.

const PANEL_WIDTH = 300

const C = {
  deep:    '#16211D',
  slate:   '#25322E',
  slate2:  '#2E3D38',
  meadow:  '#BCD6A4',
  sage:    '#DCE5DC',
  paper:   '#F2F5F0',
  line:    '#C9D4C8',
  lineSage:'#C2CEC1',
  lineDark:'#3B4A44',
  ink:     '#1B2A24',
  body:    '#46554E',
  muted:   '#5C6B63',
  bodyDark:'#C2CFC5',
  mutedDk: '#93A398',
  phBg:    '#E6EDE5',
  phBgSage:'#D0DBD0',
  phLine:  '#B7C4B6',
  phLineSg:'#AFBDAF',
  phBgDk:  '#2B3A35',
  phLineDk:'#45564F',
  phIcon:  '#8C9C8D',
  phIconDk:'#7E9384',
  phLabel: '#5F6E64',
  white:   '#FFFFFF',
  fieldLn: '#C2CEC1',
  fieldPh: '#78877E',
  serifNum:'#7A8A80',
}

// ---------- fonts ----------
interface Face { family: string; style: string }
let DISPLAY: Face = { family: 'Newsreader', style: 'Regular' }
let SANS_R: Face = { family: 'Archivo', style: 'Regular' }
let SANS_M: Face = { family: 'Archivo', style: 'Medium' }
let SANS_S: Face = { family: 'Archivo', style: 'SemiBold' }

async function tryFont(face: Face): Promise<boolean> {
  try { await figma.loadFontAsync(face); return true } catch (e) { return false }
}

async function ensureFonts(): Promise<string[]> {
  const notes: string[] = []
  if (!(await tryFont(DISPLAY))) {
    if (await tryFont({ family: 'Georgia', style: 'Regular' })) DISPLAY = { family: 'Georgia', style: 'Regular' }
    else { DISPLAY = { family: 'Inter', style: 'Regular' }; await tryFont(DISPLAY) }
    notes.push('Newsreader unavailable — headlines use ' + DISPLAY.family + '.')
  }
  const okR = await tryFont(SANS_R)
  const okM = await tryFont(SANS_M)
  const okS = await tryFont(SANS_S)
  if (!okR || !okM || !okS) {
    SANS_R = { family: 'Inter', style: 'Regular' }
    SANS_M = { family: 'Inter', style: 'Medium' }
    SANS_S = { family: 'Inter', style: 'Semi Bold' }
    await tryFont(SANS_R); await tryFont(SANS_M); await tryFont(SANS_S)
    notes.push('Archivo unavailable — body and labels use Inter.')
  }
  return notes
}

// ---------- paint ----------
function rgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  }
}
function solid(hex: string): SolidPaint { return { type: 'SOLID', color: rgb(hex) } }

// ---------- spec types ----------
type Align = 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
interface Span { start: number; end: number; color: string }

interface Box {
  k: 'v' | 'h'
  name?: string
  bg?: string
  pad?: number[]        // [top, right, bottom, left]
  gap?: number
  w?: number
  h?: number
  main?: Align          // primary axis
  cross?: 'MIN' | 'CENTER' | 'MAX'
  stretch?: boolean
  grow?: number
  stroke?: string
  dashed?: boolean
  kids: Spec[]
}
interface Txt {
  k: 'txt'
  s: string
  font: 'display' | 'r' | 'm' | 's'
  size: number
  lh: number
  ls?: number           // percent
  color: string
  upper?: boolean
  align?: 'LEFT' | 'CENTER' | 'RIGHT'
  w?: number
  stretch?: boolean
  spans?: Span[]
  name?: string
}
interface Rect { k: 'rect'; w: number; h: number; bg?: string; stroke?: string; dashed?: boolean; stretch?: boolean; name?: string }
interface Svg  { k: 'svg'; svg: string; w: number; h: number; name?: string }
type Spec = Box | Txt | Rect | Svg

function V(o: Partial<Box> & { kids: Spec[] }): Box { return Object.assign({ k: 'v' } as Box, o) as Box }
function H(o: Partial<Box> & { kids: Spec[] }): Box { return Object.assign({ k: 'h' } as Box, o) as Box }
function T(o: Partial<Txt> & { s: string; size: number; lh: number; color: string }): Txt {
  return Object.assign({ k: 'txt', font: 'r' } as Txt, o) as Txt
}
function R(o: Partial<Rect> & { w: number; h: number }): Rect { return Object.assign({ k: 'rect' } as Rect, o) as Rect }
function S(svg: string, w: number, h: number, name?: string): Svg { return { k: 'svg', svg: svg, w: w, h: h, name: name } }

// ---------- renderer ----------
function faceFor(f: string): Face {
  if (f === 'display') return DISPLAY
  if (f === 'm') return SANS_M
  if (f === 's') return SANS_S
  return SANS_R
}

function render(spec: Spec): SceneNode {
  if (spec.k === 'txt') {
    const t = figma.createText()
    t.fontName = faceFor(spec.font)
    t.characters = spec.upper ? spec.s.toUpperCase() : spec.s
    t.fontSize = spec.size
    t.lineHeight = { value: spec.lh, unit: 'PIXELS' }
    if (spec.ls !== undefined) t.letterSpacing = { value: spec.ls, unit: 'PERCENT' }
    t.fills = [solid(spec.color)]
    t.textAlignHorizontal = spec.align || 'LEFT'
    t.textAutoResize = 'HEIGHT'
    if (spec.w) t.resize(spec.w, t.height)
    if (spec.name) t.name = spec.name
    if (spec.spans) {
      for (const sp of spec.spans) {
        const end = Math.min(sp.end, t.characters.length)
        if (sp.start < end) t.setRangeFills(sp.start, end, [solid(sp.color)])
      }
    }
    return t
  }

  if (spec.k === 'rect') {
    const r = figma.createRectangle()
    r.resize(spec.w, spec.h)
    r.fills = spec.bg ? [solid(spec.bg)] : []
    if (spec.stroke) {
      r.strokes = [solid(spec.stroke)]
      r.strokeWeight = 1
      if (spec.dashed) r.dashPattern = [4, 4]
    } else {
      r.strokes = []
    }
    r.cornerRadius = 0
    if (spec.name) r.name = spec.name
    return r
  }

  if (spec.k === 'svg') {
    const n = figma.createNodeFromSvg(spec.svg)
    n.resize(spec.w, spec.h)
    n.name = spec.name || 'Graphic'
    return n
  }

  // Box
  const f = figma.createFrame()
  f.layoutMode = spec.k === 'v' ? 'VERTICAL' : 'HORIZONTAL'
  f.name = spec.name || (spec.k === 'v' ? 'Stack' : 'Row')
  f.clipsContent = false
  f.cornerRadius = 0
  if (spec.stroke) {
    f.strokes = [solid(spec.stroke)]
    f.strokeWeight = 1
    if (spec.dashed) f.dashPattern = [4, 4]
  } else {
    f.strokes = []
  }
  f.fills = spec.bg ? [solid(spec.bg)] : []
  f.itemSpacing = spec.gap || 0
  const p = spec.pad || [0, 0, 0, 0]
  f.paddingTop = p[0]; f.paddingRight = p[1]; f.paddingBottom = p[2]; f.paddingLeft = p[3]
  f.primaryAxisAlignItems = (spec.main || 'MIN') as any
  f.counterAxisAlignItems = (spec.cross || 'MIN') as any
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'

  for (const kid of spec.kids) {
    const node = render(kid)
    f.appendChild(node)
    const anyKid = kid as { stretch?: boolean; grow?: number }
    if (anyKid.stretch && 'layoutAlign' in node) node.layoutAlign = 'STRETCH'
    if (anyKid.grow && 'layoutGrow' in node) node.layoutGrow = anyKid.grow
  }

  // Fixed width/height applied AFTER children so auto-layout settles first.
  if (spec.w !== undefined) {
    f.counterAxisSizingMode = spec.k === 'v' ? 'FIXED' : f.counterAxisSizingMode
    f.primaryAxisSizingMode = spec.k === 'h' ? 'FIXED' : f.primaryAxisSizingMode
    f.resize(spec.w, f.height)
  }
  if (spec.h !== undefined) {
    f.primaryAxisSizingMode = spec.k === 'v' ? 'FIXED' : f.primaryAxisSizingMode
    f.counterAxisSizingMode = spec.k === 'h' ? 'FIXED' : f.counterAxisSizingMode
    f.resize(f.width, spec.h)
  }
  return f
}

// ---------- shared graphics ----------
const ARCH_MARK = (stroke: string) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 22" fill="none" stroke="' + stroke +
  '" stroke-width="2.4" stroke-linecap="square">' +
  '<path d="M2 21 A18 18 0 0 1 38 21"/><path d="M8 21 A12 12 0 0 1 32 21"/><path d="M14 21 A6 6 0 0 1 26 21"/></svg>'

const ARCH_FIELD =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" fill="none" stroke="' + C.slate2 +
  '" stroke-width="15">' +
  '<path d="M40 300 A260 260 0 0 1 560 300"/><path d="M80 300 A220 220 0 0 1 520 300"/>' +
  '<path d="M120 300 A180 180 0 0 1 480 300"/><path d="M160 300 A140 140 0 0 1 440 300"/>' +
  '<path d="M200 300 A100 100 0 0 1 400 300"/><path d="M240 300 A60 60 0 0 1 360 300"/></svg>'

const ico = (paths: string, stroke: string, w: number) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' + stroke +
  '" stroke-width="1.5" stroke-linecap="square">' + paths + '</svg>'

const P_SHIELD = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>'
const P_TAG    = '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'
const P_HOME   = '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
const P_RAIN   = '<path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="16" y1="19" x2="16" y2="21"/>'
const P_DOLLAR = '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'
const P_CLOCK  = '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
const P_CHECK  = '<polyline points="20 6 9 17 4 12"/>'
const P_LOCK   = '<rect x="3" y="11" width="18" height="11"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
const P_MAIL   = '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'
const P_ARROW  = '<line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>'
const P_CHEV   = '<polyline points="6 9 12 15 18 9"/>'
const P_IMG    = '<rect x="3" y="3" width="18" height="18"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'
const P_PLAY   = '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="' + C.phIconDk + '" stroke="none"/>'
const P_CAL    = '<rect x="3" y="4" width="18" height="18"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'

// ---------- copy (verbatim from the Master Funnel Register) ----------
const COPY = {
  eyebrowHero: 'Vancouver Island & Lower Mainland Homeowners',
  h1: 'Turn 600 Sq Ft of Your Unused Lawn Into a $1,800/Month Income Stream or Private Family Suite In Just 8 to 12 Weeks.',
  heroSub: 'We build beautiful small homes in a clean indoor facility. You get a locked-in price, zero builder tricks, no mess in your yard, and no weather delays.',
  badge: 'Installed in 7 Days  ·  Move-In Ready in Weeks',
  ctaMain: 'Claim Your $10,000 Rebate & Book Your Tour Here',
  trust: ['CSA A277 Certified', '100% Fixed-Price Guarantee', '2-5-10 Home Warranty Ready', 'Engineered for BC Weather'],
  h2Problem: 'No Matter What Lever You Pull, the Real Estate Numbers in BC Just Don’t Make Sense Anymore.',
  p1: 'Navigating today’s housing costs feels expensive, painful, and confusing. If you’re a homeowner in Nanaimo or the Lower Mainland, you’ve likely realized that every traditional path feels like a dead end.',
  p2: 'You might think about selling to downsize, but real estate fees, taxes, and moving costs instantly eat up $30,000+ of your equity. You may look into building a secondary suite, but contractors quote $400,000+, take months, and give zero budget guarantees. Or you might try helping adult kids rent an apartment or finding ground-level space for aging parents, only to watch thousands vanish every month into a stranger’s mortgage while bleeding your family wealth dry.',
  pull: 'Every option leads to the exact same outcome: high financial stress, lost time, and feeling stuck with an expensive asset that isn’t working for you.',
  h2Root: 'The Real Problem Is the Way Homes Are Built On-Site.',
  pains: [
    'Regular builders bring workers, tools, and trucks to your yard.',
    'They leave wood out in the rain.',
    'They run into constant delays, make tons of noise right outside your window, and charge you extra every time something goes wrong.',
    'When people build outdoors on your lawn, it always takes too long and costs too much.',
  ],
  h2Shift: 'We build your home indoors where nothing can go wrong',
  shift: [
    'We take the whole project off your lawn and move it inside a warm, clean factory in Nanaimo.',
    'Because we build indoors, rain never delays us. We buy materials in big batches, so your price stays completely locked.',
    'You get a brand-new, safe home built in just 8 to 12 weeks.',
    'When the home is fully finished, we bring it to your yard on a truck, place it on your ground, hook up the power and water, and hand you the keys.',
  ],
  h2Meet: 'Meet Cueva Homes',
  meet: [
    'We are the only ones in BC who can build lots of these homes fast without making them cheap or flimsy.',
    'We take care of every single step for you. From getting city permits to installing the home,',
    'So you never have to deal with noisy workers or builder stress',
  ],
  h2Why: 'Why Cueva beats regular builders every single time?',
  why: [
    ['One Clear Price', 'The price we quote you is the exact price you pay. No surprise bills ever.', P_DOLLAR],
    ['Done in Weeks', 'We finish in 8 to 12 weeks, not a full year of loud hammering.', P_CLOCK],
    ['Built Indoors', 'Your home is built inside a warm factory, safe from BC rain and mud.', P_HOME],
    ['Zero Work For You', 'We handle the city, the setup, and the build while you relax.', P_CHECK],
  ] as Array<[string, string, string]>,
  h2Show: 'Come walk inside our Nanaimo show home and see for yourself.',
  show: [
    'Reading about a home is one thing, but stepping inside changes everything. Most people worry a small home will feel tiny, but walking inside our show home proves how big, bright, and comfy it actually is.',
    'You can touch the walls, check out the kitchen, see the high ceilings, and talk to our team about your yard.',
    'If you live far away, you can do a live 3D Zoom tour on your phone or computer instead.',
  ],
  ctaTour: 'Reserve Your Private Tour Right Now',
  h2Book: 'Reserve Your Private Tour Right Now',
  walkTitle: 'Reserve Your Private Walkthrough (In-Person)',
  walkBody: 'Experience the high-end architectural finishes, ceiling height, and full spatial layout for yourself.',
  ticks: [
    'Locked-in, fixed price — no surprise bills',
    'Built in 8 to 12 weeks, indoors',
    'Can’t travel? Take a live 3D Zoom tour instead',
  ],
  fields: [
    ['1. Do you own an empty lot or land?', 'Select…', 'Dropdown: Yes / No'],
    ['2. The investment range you’re looking at is $165K to $300K. Are you comfortable with this amount?', '', ''],
    ['3. Full Name', 'Your full name', ''],
    ['4. Email Address', 'you@email.com', ''],
    ['5. Phone Number (for SMS confirmation)', '(250) 000-0000', ''],
    ['6. Property Location', 'Select…', 'Nanaimo / Victoria / Mid-Island / North Island / Lower Mainland / Other'],
    ['7. Select The Date Of Your Tour', '', ''],
  ] as Array<[string, string, string]>,
  privacy: 'Your information is 100% private. Zero high-pressure sales calls. Instant booking confirmation.',
  footLine: 'CUEVA HOMES LTD.  |  Factory-Built Backyard Suites  |  Nanaimo, Vancouver Island, BC  |  Cueva.ca  |  Email: info@cueva.ca',
  footLegal: 'Terms & Conditions  |  Privacy Policy',
}

const H1_SPANS: Span[] = (function () {
  const s = COPY.h1
  const a = s.indexOf('$1,800/Month Income Stream')
  const b = s.indexOf('8 to 12 Weeks')
  const out: Span[] = []
  if (a >= 0) out.push({ start: a, end: a + '$1,800/Month Income Stream'.length, color: C.meadow })
  if (b >= 0) out.push({ start: b, end: b + '8 to 12 Weeks'.length, color: C.meadow })
  return out
})()

// ---------- reusable pieces ----------
function eyebrow(s: string, color: string, ls: number, size: number): Txt {
  return T({ s: s, font: 's', size: size, lh: Math.round(size * 1.5), ls: ls, color: color, upper: true, name: 'Eyebrow' })
}
function rule(w: number, color: string): Rect {
  return R({ w: w, h: 1, bg: color, name: 'Rule', stretch: true })
}
function btn(label: string, dark: boolean, w: number, fs: number, padV: number, padH: number, center: boolean): Box {
  return H({
    name: 'Button / ' + (dark ? 'Meadow on dark' : 'Slate on light'),
    bg: dark ? C.meadow : C.slate,
    pad: [padV, padH, padV, padH], gap: 12, cross: 'CENTER',
    main: center ? 'CENTER' : 'MIN',
    w: w,
    kids: [
      T({ s: label, font: 's', size: fs, lh: Math.round(fs * 1.4), ls: 6, color: dark ? C.ink : C.paper, upper: true, align: center ? 'CENTER' : 'LEFT', grow: center ? 1 : 0 } as any),
      S(ico(P_ARROW, dark ? C.ink : C.paper, 18), 18, 18, 'Arrow'),
    ],
  })
}
function slot(w: number, h: number, label: string, note: string, tone: 'light' | 'sage' | 'dark', iconPaths: string): Box {
  const bg = tone === 'dark' ? C.phBgDk : tone === 'sage' ? C.phBgSage : C.phBg
  const ln = tone === 'dark' ? C.phLineDk : tone === 'sage' ? C.phLineSg : C.phLine
  const ic = tone === 'dark' ? C.phIconDk : C.phIcon
  const lc = tone === 'dark' ? C.mutedDk : C.phLabel
  const nc = tone === 'dark' ? '#A9B9AE' : C.muted
  const kids: Spec[] = [
    S(ico(iconPaths, ic, 40), 40, 40, 'Icon'),
    T({ s: label, font: 's', size: 12, lh: 18, ls: 17, color: lc, upper: true, align: 'CENTER', w: Math.min(w - 64, 520), name: 'Slot label' }),
  ]
  if (note) kids.push(T({ s: note, size: 14, lh: 22, color: nc, align: 'CENTER', w: Math.min(w - 64, 520), name: 'Slot brief' }))
  return V({
    name: 'ASSET SLOT — ' + label, bg: bg, stroke: ln, dashed: true,
    w: w, h: h, gap: 12,
    main: 'CENTER', cross: 'CENTER', pad: [28, 28, 28, 28], kids: kids,
  })
}
function trustItem(label: string, paths: string, w: number): Box {
  return H({
    name: 'Trust item', gap: 14, cross: 'CENTER', w: w,
    kids: [
      S(ico(paths, C.slate, 24), 24, 24, 'Icon'),
      T({ s: label, font: 'm', size: 15, lh: 21, color: C.ink, grow: 1 } as any),
    ],
  })
}
function numberedRow(n: string, body: string, w: number, lineColor: string, fs: number): Box {
  return H({
    name: 'Row ' + n, gap: 20, pad: [22, 0, 22, 0], w: w,
    kids: [
      T({ s: n, font: 'display', size: fs + 1, lh: fs + 8, color: C.serifNum, w: 26, name: 'No.' }),
      T({ s: body, size: fs, lh: Math.round(fs * 1.65), color: C.body, grow: 1 } as any),
    ],
  })
}
function tick(body: string, w: number): Box {
  return H({
    name: 'Tick', gap: 14, pad: [18, 0, 18, 0], cross: 'CENTER', w: w,
    kids: [
      S(ico(P_CHECK, C.meadow, 18), 18, 18, 'Check'),
      T({ s: body, size: 16, lh: 24, color: C.bodyDark, grow: 1 } as any),
    ],
  })
}
function field(label: string, placeholder: string, hint: string, w: number, isCal: boolean): Box {
  const kids: Spec[] = [
    T({ s: label, font: 'm', size: 14, lh: 21, color: C.ink, stretch: true, name: 'Label' }),
  ]
  if (isCal) {
    kids.push(slot(w, 190, 'Calendar picker', 'Shopify app or embedded booking widget — shows available tour dates.', 'light', P_CAL))
  } else if (placeholder) {
    kids.push(H({
      name: 'Input', bg: C.white, w: w, h: 54, pad: [0, 16, 0, 16], cross: 'CENTER', main: 'SPACE_BETWEEN',
      kids: [
        T({ s: placeholder, size: 16, lh: 24, color: placeholder === 'Select…' ? C.muted : C.fieldPh }),
        S(ico(P_CHEV, C.muted, 16), 16, 16, 'Chevron'),
      ],
    }))
  } else {
    kids.push(H({
      name: 'Choice', gap: 12, w: w,
      kids: [
        H({ name: 'Yes', bg: C.white, h: 54, main: 'CENTER', cross: 'CENTER', grow: 1, kids: [T({ s: 'Yes', size: 16, lh: 24, color: C.body })] } as any),
        H({ name: 'No', bg: C.white, h: 54, main: 'CENTER', cross: 'CENTER', grow: 1, kids: [T({ s: 'No', size: 16, lh: 24, color: C.body })] } as any),
      ],
    }))
  }
  if (hint) kids.push(T({ s: hint, size: 13, lh: 20, color: C.muted, stretch: true, name: 'Hint' }))
  return V({ name: 'Field — ' + label.substring(0, 28), gap: 9, w: w, kids: kids })
}

// ---------- desktop page ----------
function desktopPage(): Box {
  const W = 1440, PAD = 100, INNER = W - PAD * 2   // 1240
  const half = (INNER - 80) / 2
  const secPad = [118, PAD, 118, PAD]

  const header = H({
    name: 'Header', bg: C.slate, w: W, pad: [24, PAD, 24, PAD], main: 'SPACE_BETWEEN', cross: 'CENTER',
    kids: [
      H({ name: 'Wordmark', gap: 15, cross: 'CENTER', kids: [
        S(ARCH_MARK(C.paper), 42, 24, 'Arch mark (placeholder)'),
        T({ s: 'CUEVA', font: 's', size: 19, lh: 26, ls: 34, color: C.paper }),
      ] }),
      H({ name: 'Right', gap: 30, cross: 'CENTER', kids: [
        T({ s: 'Factory-Built Backyard Suites  ·  Nanaimo, BC', size: 13, lh: 20, color: C.mutedDk }),
        btn('Book Your Tour', true, 0, 12, 14, 24, false),
      ] }),
    ],
  })

  const hero = V({
    name: '01 Hero', bg: C.slate, w: W, pad: [92, PAD, 84, PAD], gap: 0,
    kids: [
      V({ name: 'Hero copy', gap: 26, w: 1000, kids: [
        eyebrow(COPY.eyebrowHero, C.meadow, 22, 12),
        T({ s: COPY.h1, font: 'display', size: 66, lh: 70, ls: -1.8, color: C.paper, w: 1000, spans: H1_SPANS, name: 'H1' }),
        T({ s: COPY.heroSub, size: 19, lh: 32, color: C.bodyDark, w: 760, name: 'Sub' }),
      ] }),
      R({ w: 1, h: 50, name: 'spacer' }),
      slot(INNER, 540, 'Hero video — 30 second silent loop, autoplay', 'A CUEVA suite being crane-installed, overlaid with a callout badge.', 'dark', P_PLAY),
      R({ w: 1, h: 20, name: 'spacer' }),
      H({ name: 'Badge', bg: C.meadow, pad: [13, 22, 13, 22], kids: [
        T({ s: COPY.badge, font: 's', size: 12, lh: 18, ls: 13, color: C.ink, upper: true }),
      ] }),
      R({ w: 1, h: 22, name: 'spacer' }),
      btn(COPY.ctaMain, true, 0, 16, 24, 46, false),
    ],
  })

  const trust = V({
    name: '02 Trust strip', bg: C.sage, w: W, pad: [40, PAD, 40, PAD], gap: 22,
    kids: [
      H({ name: 'Certifications', gap: 30, w: INNER, kids: COPY.trust.map((t, i) =>
        trustItem(t, [P_SHIELD, P_TAG, P_HOME, P_RAIN][i], (INNER - 90) / 4)) }),
      T({ s: 'Placeholder icons — replace each with the supplied certification logo from the brand media folder.', size: 12, lh: 18, color: C.muted }),
    ],
  })

  const problem = V({
    name: '03 The situation', bg: C.paper, w: W, pad: secPad,
    kids: [ H({ name: 'Split', gap: 80, w: INNER, kids: [
      V({ name: 'Copy', gap: 28, w: 640, kids: [
        eyebrow('The Situation', C.muted, 22, 12),
        rule(640, C.line),
        T({ s: COPY.h2Problem, font: 'display', size: 46, lh: 52, ls: -1.2, color: C.ink, w: 640, name: 'H2' }),
        T({ s: COPY.p1, size: 18, lh: 31, color: C.body, w: 640 }),
        T({ s: COPY.p2, size: 18, lh: 31, color: C.body, w: 640 }),
        V({ name: 'Pull quote', bg: C.sage, pad: [30, 34, 30, 34], w: 640, kids: [
          T({ s: COPY.pull, font: 'display', size: 24, lh: 35, color: C.ink, w: 572 }),
        ] }),
      ] }),
      slot(520, 660, 'Section image', 'Nanaimo / Lower Mainland home exterior with unused side or back lawn.', 'light', P_IMG),
    ] }) ],
  })

  const root = V({
    name: '04 Root cause', bg: C.sage, w: W, pad: secPad,
    kids: [ H({ name: 'Split', gap: 80, w: INNER, kids: [
      slot(520, 560, 'Section image', 'Messy, overstimulated on-site construction zone. Client note: overlay a red cross mark.', 'sage', P_IMG),
      V({ name: 'Copy', gap: 28, w: 640, kids: ([
        eyebrow('The Root Cause', C.muted, 22, 12),
        rule(640, C.lineSage),
        T({ s: COPY.h2Root, font: 'display', size: 46, lh: 52, ls: -1.2, color: C.ink, w: 640, name: 'H2' }),
      ] as Spec[]).concat(
        COPY.pains.map((p, i) => {
          const row = numberedRow('0' + (i + 1), p, 640, C.lineSage, 17)
          return V({ name: 'Item', w: 640, kids: [rule(640, C.lineSage), row] }) as Spec
        })
      ).concat([rule(640, C.lineSage) as Spec]) }),
    ] }) ],
  })

  const shift = V({
    name: '05 The shift', bg: C.slate, w: W, pad: [112, PAD, 112, PAD], gap: 0, cross: 'CENTER',
    kids: [
      V({ name: 'Head', gap: 22, cross: 'CENTER', w: 900, kids: [
        eyebrow('The Cueva Difference', C.meadow, 22, 12),
        T({ s: COPY.h2Shift, font: 'display', size: 52, lh: 58, ls: -1.2, color: C.paper, w: 880, align: 'CENTER', name: 'H2' }),
      ] }),
      R({ w: 1, h: 48, name: 'spacer' }),
      slot(INNER, 460, 'Section image or video', 'CUEVA homes in production — interior of the Nanaimo indoor facility, or the build-process video.', 'dark', P_IMG),
      R({ w: 1, h: 54, name: 'spacer' }),
      V({ name: 'Statements', gap: 0, w: INNER, kids: COPY.shift.map((s) =>
        V({ name: 'Statement', w: INNER, kids: [
          rule(INNER, C.lineDark),
          V({ pad: [26, 0, 26, 0], w: INNER, kids: [T({ s: s, size: 18, lh: 32, color: C.bodyDark, w: INNER })] }),
        ] }) as Spec).concat([rule(INNER, C.lineDark) as Spec]) }),
    ],
  })

  const meetCells: Spec[] = [
    slot(620, 300, 'Cueva Homes — exterior', '', 'light', P_IMG),
    V({ name: 'Statement 01', bg: C.sage, w: 310, h: 300, pad: [40, 34, 40, 34], main: 'SPACE_BETWEEN', kids: [
      T({ s: '01', font: 'display', size: 30, lh: 36, color: C.serifNum }),
      T({ s: COPY.meet[0], size: 17, lh: 29, color: C.ink, w: 242 }),
    ] }),
    V({ name: 'Arch panel', bg: C.slate, w: 310, h: 300, kids: [S(ARCH_FIELD, 310, 300, 'Arch pattern')] }),
    V({ name: 'Statement 02', bg: C.slate, w: 310, h: 300, pad: [40, 34, 40, 34], main: 'SPACE_BETWEEN', kids: [
      T({ s: '02', font: 'display', size: 30, lh: 36, color: C.meadow }),
      T({ s: COPY.meet[1], size: 17, lh: 29, color: C.bodyDark, w: 242 }),
    ] }),
    slot(620, 300, 'Nanaimo facility — interior', '', 'light', P_IMG),
    V({ name: 'Statement 03', bg: C.sage, w: 310, h: 300, pad: [40, 34, 40, 34], main: 'SPACE_BETWEEN', kids: [
      T({ s: '03', font: 'display', size: 30, lh: 36, color: C.serifNum }),
      T({ s: COPY.meet[2], size: 17, lh: 29, color: C.ink, w: 242 }),
    ] }),
  ]
  const meet = V({
    name: '06 Meet Cueva Homes', bg: C.paper, w: W, pad: [118, 0, 0, 0], gap: 54, cross: 'CENTER',
    kids: [
      V({ name: 'Head', gap: 20, cross: 'CENTER', kids: [
        eyebrow('Who We Are', C.muted, 22, 12),
        T({ s: COPY.h2Meet, font: 'display', size: 52, lh: 58, ls: -1.2, color: C.ink, align: 'CENTER', name: 'H2' }),
      ] }),
      V({ name: 'Block grid', w: W, gap: 0, kids: [
        H({ name: 'Row 1', w: W, gap: 0, kids: [meetCells[0], meetCells[1], meetCells[2]] }),
        H({ name: 'Row 2', w: W, gap: 0, kids: [meetCells[3], meetCells[4], meetCells[5]] }),
      ] }),
    ],
  })

  const whyCard = (i: number) => {
    const c = COPY.why[i]
    return V({
      name: 'Card — ' + c[0], bg: C.paper, w: 619, pad: [40, 40, 40, 40], gap: 20,
      kids: [
        V({ gap: 12, w: 539, kids: [
          S(ico(c[2], C.slate, 28), 28, 28, 'Icon'),
          T({ s: c[0], font: 'display', size: 27, lh: 33, color: C.ink, name: 'H3' }),
          T({ s: c[1], size: 17, lh: 29, color: C.body, w: 539 }),
        ] }),
        slot(539, 170, 'Image', '', 'light', P_IMG),
      ],
    })
  }
  const why = V({
    name: '07 Why Cueva', bg: C.paper, w: W, pad: secPad, gap: 56, cross: 'CENTER',
    kids: [
      V({ name: 'Head', gap: 20, cross: 'CENTER', w: 900, kids: [
        eyebrow('The Comparison', C.muted, 22, 12),
        T({ s: COPY.h2Why, font: 'display', size: 48, lh: 54, ls: -1.2, color: C.ink, w: 900, align: 'CENTER', name: 'H2' }),
      ] }),
      V({ name: 'Grid', w: INNER, gap: 1, bg: C.line, kids: [
        H({ w: INNER, gap: 1, kids: [whyCard(0), whyCard(1)] }),
        H({ w: INNER, gap: 1, kids: [whyCard(2), whyCard(3)] }),
      ] }),
    ],
  })

  const show = V({
    name: '08 Show home', bg: C.sage, w: W, pad: secPad,
    kids: [ H({ name: 'Split', gap: 80, w: INNER, cross: 'CENTER', kids: [
      V({ name: 'Copy', gap: 26, w: 580, kids: [
        eyebrow('See It For Yourself', C.muted, 22, 12),
        rule(580, C.lineSage),
        T({ s: COPY.h2Show, font: 'display', size: 46, lh: 52, ls: -1.2, color: C.ink, w: 580, name: 'H2' }),
        T({ s: COPY.show[0], size: 18, lh: 31, color: C.body, w: 580 }),
        T({ s: COPY.show[1], size: 18, lh: 31, color: C.body, w: 580 }),
        T({ s: COPY.show[2], size: 18, lh: 31, color: C.body, w: 580 }),
        btn(COPY.ctaTour, false, 0, 15, 21, 38, false),
      ] }),
      slot(580, 640, 'Nanaimo facility image', 'Interior of the Nanaimo show home — wide shot showing ceiling height and natural light.', 'sage', P_IMG),
    ] }) ],
  })

  const formW = 636 - 92
  const booking = V({
    name: '09 Booking', bg: C.slate, w: W, pad: [112, PAD, 112, PAD], gap: 56, cross: 'CENTER',
    kids: [
      V({ name: 'Head', gap: 20, cross: 'CENTER', w: 900, kids: [
        eyebrow('Two Steps Left', C.meadow, 22, 12),
        T({ s: COPY.h2Book, font: 'display', size: 52, lh: 58, ls: -1.2, color: C.paper, w: 900, align: 'CENTER', name: 'H2' }),
      ] }),
      H({ name: 'Split', gap: 56, w: INNER, kids: [
        V({ name: 'Form card', bg: C.paper, w: 636, pad: [46, 46, 46, 46], gap: 24, kids: ([] as Spec[]).concat(
          COPY.fields.map((f, i) => field(f[0], f[1], f[2], formW, i === 6) as Spec),
          [
            btn(COPY.ctaMain, false, formW, 17, 25, 28, true) as Spec,
            H({ name: 'Privacy', gap: 11, w: formW, kids: [
              S(ico(P_LOCK, C.slate, 16), 16, 16, 'Lock'),
              T({ s: COPY.privacy, size: 14, lh: 23, color: C.body, grow: 1 } as any),
            ] }) as Spec,
          ]
        ) }),
        V({ name: 'Walkthrough', gap: 28, w: 548, kids: ([
          slot(548, 390, 'High-resolution video — 30 second loop', 'A CUEVA suite being crane-installed in a single day, with the callout badge overlaid.', 'dark', P_PLAY),
          T({ s: COPY.walkTitle, font: 'display', size: 34, lh: 40, color: C.paper, w: 548, name: 'H3' }),
          T({ s: COPY.walkBody, size: 18, lh: 31, color: C.bodyDark, w: 548 }),
        ] as Spec[]).concat(
          COPY.ticks.map((t) => V({ name: 'Tick row', w: 548, kids: [rule(548, C.lineDark), tick(t, 548)] }) as Spec)
        ).concat([rule(548, C.lineDark) as Spec]) }),
      ] }),
    ],
  })

  const footer = V({
    name: '10 Footer', bg: C.deep, w: W, pad: [58, PAD, 58, PAD], gap: 26,
    kids: [
      H({ name: 'Top', w: INNER, main: 'SPACE_BETWEEN', cross: 'CENTER', kids: [
        H({ gap: 15, cross: 'CENTER', kids: [
          S(ARCH_MARK(C.paper), 40, 23, 'Arch mark (placeholder)'),
          T({ s: 'CUEVA', font: 's', size: 18, lh: 25, ls: 34, color: C.paper }),
        ] }),
        H({ gap: 11, cross: 'CENTER', kids: [
          S(ico(P_MAIL, C.meadow, 17), 17, 17, 'Mail'),
          T({ s: 'info@cueva.ca', size: 15, lh: 23, color: '#A3B1A7' }),
        ] }),
      ] }),
      rule(INNER, '#2A3733'),
      H({ name: 'Legal', w: INNER, main: 'SPACE_BETWEEN', cross: 'CENTER', kids: [
        T({ s: COPY.footLine, size: 14, lh: 24, color: C.mutedDk }),
        T({ s: COPY.footLegal, size: 14, lh: 24, color: C.mutedDk }),
      ] }),
    ],
  })

  return V({
    name: 'CUEVA — Landing page / Desktop 1440', bg: C.paper, w: W, gap: 0,
    kids: [header, hero, trust, problem, root, shift, meet, why, show, booking, footer],
  })
}

// ---------- mobile page ----------
function mobilePage(): Box {
  const W = 390, PAD = 22, INNER = W - PAD * 2   // 346
  const secPad = [56, PAD, 56, PAD]

  const header = H({
    name: 'Header', bg: C.slate, w: W, pad: [16, PAD, 16, PAD], main: 'SPACE_BETWEEN', cross: 'CENTER',
    kids: [
      H({ gap: 11, cross: 'CENTER', kids: [
        S(ARCH_MARK(C.paper), 32, 18, 'Arch mark (placeholder)'),
        T({ s: 'CUEVA', font: 's', size: 15, lh: 21, ls: 30, color: C.paper }),
      ] }),
      btn('Book Tour', true, 0, 12, 16, 18, false),
    ],
  })

  const hero = V({
    name: '01 Hero', bg: C.slate, w: W, pad: [40, PAD, 44, PAD], gap: 18,
    kids: [
      eyebrow(COPY.eyebrowHero, C.meadow, 18, 12),
      T({ s: COPY.h1, font: 'display', size: 35, lh: 40, ls: -1.2, color: C.paper, w: INNER, spans: H1_SPANS, name: 'H1' }),
      T({ s: COPY.heroSub, size: 16, lh: 27, color: C.bodyDark, w: INNER, name: 'Sub' }),
      slot(INNER, 290, 'Hero video — 30s loop', 'A CUEVA suite being crane-installed, with the callout badge overlaid.', 'dark', P_PLAY),
      H({ name: 'Badge', bg: C.meadow, w: INNER, pad: [12, 12, 12, 12], main: 'CENTER', kids: [
        T({ s: COPY.badge, font: 's', size: 11, lh: 16, ls: 10, color: C.ink, upper: true, align: 'CENTER', w: 322 }),
      ] }),
      btn(COPY.ctaMain, true, INNER, 14, 21, 20, true),
    ],
  })

  const trust = V({
    name: '02 Trust strip', bg: C.sage, w: W, pad: [26, PAD, 26, PAD], gap: 0,
    kids: COPY.trust.map((t, i) => V({ name: 'Item', w: INNER, kids: ([] as Spec[]).concat(
      i > 0 ? [rule(INNER, C.lineSage) as Spec] : [],
      [V({ pad: [14, 0, 14, 0], w: INNER, kids: [trustItem(t, [P_SHIELD, P_TAG, P_HOME, P_RAIN][i], INNER)] }) as Spec]
    ) }) as Spec),
  })

  const problem = V({
    name: '03 The situation', bg: C.paper, w: W, pad: secPad, gap: 20,
    kids: [
      eyebrow('The Situation', C.muted, 18, 12),
      rule(INNER, C.line),
      T({ s: COPY.h2Problem, font: 'display', size: 29, lh: 35, color: C.ink, w: INNER, name: 'H2' }),
      slot(INNER, 230, 'Section image', 'Nanaimo / Lower Mainland home exterior with unused lawn.', 'light', P_IMG),
      T({ s: COPY.p1, size: 16, lh: 28, color: C.body, w: INNER }),
      T({ s: COPY.p2, size: 16, lh: 28, color: C.body, w: INNER }),
      V({ name: 'Pull quote', bg: C.sage, w: INNER, pad: [24, 24, 24, 24], kids: [
        T({ s: COPY.pull, font: 'display', size: 20, lh: 30, color: C.ink, w: 298 }),
      ] }),
    ],
  })

  const root = V({
    name: '04 Root cause', bg: C.sage, w: W, pad: secPad, gap: 20,
    kids: ([
      eyebrow('The Root Cause', C.muted, 18, 12),
      rule(INNER, C.lineSage),
      T({ s: COPY.h2Root, font: 'display', size: 29, lh: 35, color: C.ink, w: INNER, name: 'H2' }),
      slot(INNER, 210, 'Messy on-site build', 'Client note: overlay a red cross mark.', 'sage', P_IMG),
    ] as Spec[]).concat(
      COPY.pains.map((p, i) => V({ name: 'Item', w: INNER, kids: [rule(INNER, C.lineSage), numberedRow('0' + (i + 1), p, INNER, C.lineSage, 15)] }) as Spec)
    ).concat([rule(INNER, C.lineSage) as Spec]),
  })

  const shift = V({
    name: '05 The shift', bg: C.slate, w: W, pad: secPad, gap: 18,
    kids: ([
      eyebrow('The Cueva Difference', C.meadow, 18, 12),
      T({ s: COPY.h2Shift, font: 'display', size: 31, lh: 37, color: C.paper, w: INNER, name: 'H2' }),
      slot(INNER, 230, 'Facility image or video', 'Interior of the Nanaimo indoor facility, or the build-process video.', 'dark', P_IMG),
    ] as Spec[]).concat(
      COPY.shift.map((s) => V({ name: 'Statement', w: INNER, kids: [
        rule(INNER, C.lineDark),
        V({ pad: [20, 0, 20, 0], w: INNER, kids: [T({ s: s, size: 16, lh: 28, color: C.bodyDark, w: INNER })] }),
      ] }) as Spec)
    ).concat([rule(INNER, C.lineDark) as Spec]),
  })

  const meet = V({
    name: '06 Meet Cueva Homes', bg: C.paper, w: W, pad: [56, 0, 0, 0], gap: 24,
    kids: [
      V({ name: 'Head', gap: 16, pad: [0, PAD, 0, PAD], w: W, kids: [
        eyebrow('Who We Are', C.muted, 18, 12),
        T({ s: COPY.h2Meet, font: 'display', size: 31, lh: 37, color: C.ink, name: 'H2' }),
      ] }),
      V({ name: 'Stack', w: W, gap: 0, kids: [
        slot(W, 210, 'Cueva Homes — exterior', '', 'light', P_IMG),
        V({ name: 'Statement 01', bg: C.sage, w: W, pad: [28, PAD, 28, PAD], gap: 14, kids: [
          T({ s: '01', font: 'display', size: 26, lh: 32, color: C.serifNum }),
          T({ s: COPY.meet[0], size: 16, lh: 27, color: C.ink, w: INNER }),
        ] }),
        V({ name: 'Statement 02', bg: C.slate, w: W, pad: [28, PAD, 28, PAD], gap: 14, kids: [
          T({ s: '02', font: 'display', size: 26, lh: 32, color: C.meadow }),
          T({ s: COPY.meet[1], size: 16, lh: 27, color: C.bodyDark, w: INNER }),
        ] }),
        slot(W, 210, 'Nanaimo facility — interior', '', 'light', P_IMG),
        V({ name: 'Statement 03', bg: C.sage, w: W, pad: [28, PAD, 28, PAD], gap: 14, kids: [
          T({ s: '03', font: 'display', size: 26, lh: 32, color: C.serifNum }),
          T({ s: COPY.meet[2], size: 16, lh: 27, color: C.ink, w: INNER }),
        ] }),
      ] }),
    ],
  })

  const why = V({
    name: '07 Why Cueva', bg: C.paper, w: W, pad: secPad, gap: 20,
    kids: ([
      eyebrow('The Comparison', C.muted, 18, 12),
      rule(INNER, C.line),
      T({ s: COPY.h2Why, font: 'display', size: 30, lh: 36, color: C.ink, w: INNER, name: 'H2' }),
    ] as Spec[]).concat(
      COPY.why.map((c) => V({
        name: 'Card — ' + c[0], bg: C.paper, w: INNER, pad: [26, 26, 26, 26], gap: 12, kids: [
          S(ico(c[2], C.slate, 26), 26, 26, 'Icon'),
          T({ s: c[0], font: 'display', size: 23, lh: 29, color: C.ink }),
          T({ s: c[1], size: 15, lh: 25, color: C.body, w: 294 }),
          slot(294, 130, 'Image', '', 'light', P_IMG),
        ],
      }) as Spec)
    ),
  })

  const show = V({
    name: '08 Show home', bg: C.sage, w: W, pad: secPad, gap: 20,
    kids: [
      eyebrow('See It For Yourself', C.muted, 18, 12),
      rule(INNER, C.lineSage),
      T({ s: COPY.h2Show, font: 'display', size: 29, lh: 35, color: C.ink, w: INNER, name: 'H2' }),
      slot(INNER, 250, 'Nanaimo facility image', 'Wide shot showing ceiling height and natural light.', 'sage', P_IMG),
      T({ s: COPY.show[0], size: 16, lh: 28, color: C.body, w: INNER }),
      T({ s: COPY.show[1], size: 16, lh: 28, color: C.body, w: INNER }),
      T({ s: COPY.show[2], size: 16, lh: 28, color: C.body, w: INNER }),
      btn(COPY.ctaTour, false, INNER, 14, 21, 20, true),
    ],
  })

  const mFormW = INNER - 52
  const booking = V({
    name: '09 Booking', bg: C.slate, w: W, pad: secPad, gap: 24,
    kids: ([
      eyebrow('Two Steps Left', C.meadow, 18, 12),
      T({ s: COPY.h2Book, font: 'display', size: 31, lh: 37, color: C.paper, w: INNER, name: 'H2' }),
      slot(INNER, 210, 'High-res video — 30s loop', 'Crane-installed in a single day, badge overlaid.', 'dark', P_PLAY),
      T({ s: COPY.walkTitle, font: 'display', size: 25, lh: 31, color: C.paper, w: INNER, name: 'H3' }),
      T({ s: COPY.walkBody, size: 16, lh: 28, color: C.bodyDark, w: INNER }),
    ] as Spec[]).concat(
      COPY.ticks.map((t) => V({ name: 'Tick row', w: INNER, kids: [rule(INNER, C.lineDark), tick(t, INNER)] }) as Spec)
    ).concat([
      rule(INNER, C.lineDark) as Spec,
      V({ name: 'Form card', bg: C.paper, w: INNER, pad: [26, 26, 26, 26], gap: 20, kids: ([] as Spec[]).concat(
        COPY.fields.map((f, i) => field(f[0], f[1], f[2], mFormW, i === 6) as Spec),
        [
          btn(COPY.ctaMain, false, mFormW, 14, 22, 18, true) as Spec,
          H({ name: 'Privacy', gap: 10, w: mFormW, kids: [
            S(ico(P_LOCK, C.slate, 15), 15, 15, 'Lock'),
            T({ s: COPY.privacy, size: 13, lh: 21, color: C.body, grow: 1 } as any),
          ] }) as Spec,
        ]
      ) }) as Spec,
    ]),
  })

  const footer = V({
    name: '10 Footer', bg: C.deep, w: W, pad: [36, PAD, 36, PAD], gap: 20,
    kids: [
      H({ gap: 12, cross: 'CENTER', kids: [
        S(ARCH_MARK(C.paper), 34, 20, 'Arch mark (placeholder)'),
        T({ s: 'CUEVA', font: 's', size: 16, lh: 22, ls: 32, color: C.paper }),
      ] }),
      H({ gap: 10, cross: 'CENTER', kids: [
        S(ico(P_MAIL, C.meadow, 16), 16, 16, 'Mail'),
        T({ s: 'info@cueva.ca', size: 14, lh: 22, color: '#A3B1A7' }),
      ] }),
      rule(INNER, '#2A3733'),
      T({ s: 'CUEVA HOMES LTD.\nFactory-Built Backyard Suites\nNanaimo, Vancouver Island, BC\nCueva.ca  |  Email: info@cueva.ca', size: 13, lh: 23, color: C.mutedDk, w: INNER }),
      T({ s: COPY.footLegal, size: 13, lh: 23, color: C.mutedDk }),
    ],
  })

  return V({
    name: 'CUEVA — Landing page / Mobile 390', bg: C.paper, w: W, gap: 0,
    kids: [header, hero, trust, problem, root, shift, meet, why, show, booking, footer],
  })
}

// ---------- entry ----------
type UiMessage =
  | { type: 'resize'; height: number }
  | { type: 'build'; desktop: boolean; mobile: boolean }

figma.showUI(__html__, { width: PANEL_WIDTH, height: 300 })

figma.root.setRelaunchData({ build: 'Build the Cueva landing page' })

figma.ui.onmessage = async (message: UiMessage) => {
  if (message.type === 'resize') {
    figma.ui.resize(PANEL_WIDTH, Math.max(160, Math.min(900, Math.round(message.height))))
    return
  }
  if (message.type !== 'build') return

  if (!message.desktop && !message.mobile) {
    figma.ui.postMessage({ type: 'status', text: 'Pick at least one breakpoint.', tone: 'error' })
    return
  }

  figma.ui.postMessage({ type: 'status', text: 'Loading fonts…', tone: 'busy' })
  const notes = await ensureFonts()

  try {
    const made: FrameNode[] = []
    const center = figma.viewport.center
    let cursorX = Math.round(center.x - 720)
    const topY = Math.round(center.y - 400)

    if (message.desktop) {
      figma.ui.postMessage({ type: 'status', text: 'Building desktop…', tone: 'busy' })
      const d = render(desktopPage()) as FrameNode
      figma.currentPage.appendChild(d)
      d.x = cursorX; d.y = topY
      made.push(d)
      cursorX += 1600
    }

    if (message.mobile) {
      figma.ui.postMessage({ type: 'status', text: 'Building mobile…', tone: 'busy' })
      const m = render(mobilePage()) as FrameNode
      figma.currentPage.appendChild(m)
      m.x = cursorX; m.y = topY
      made.push(m)
    }

    for (const f of made) {
      f.setRelaunchData({ build: 'Build the Cueva landing page' })
    }

    figma.currentPage.selection = made
    figma.viewport.scrollAndZoomIntoView(made)

    const built = made.map((f) => f.name.split('/')[1].trim()).join(' and ')
    let text = 'Built ' + built + '.'
    if (notes.length) text += ' ' + notes.join(' ')
    figma.ui.postMessage({ type: 'status', text: text, tone: 'ok' })
    figma.notify('Cueva landing page added to the canvas.')
  } catch (err) {
    const msg = err && (err as Error).message ? (err as Error).message : String(err)
    figma.ui.postMessage({ type: 'status', text: 'Could not build: ' + msg, tone: 'error' })
  }
}

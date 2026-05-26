---
name: ui-ux-pro-max
description: "UI/UX design intelligence for React + Hono web apps. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, 25 chart types. shadcn/ui + Tailwind CSS component system, design token architecture (primitive→semantic→component), brand identity, logo/banner/icon design, social photos. Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: SaaS dashboard, landing page, admin panel, e-commerce, portfolio, blog. Elements: button, modal, navbar, sidebar, card, table, form, chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive."
argument-hint: "[design-type] [context]"
license: MIT
metadata:
  author: claudekit
  version: "3.0.0"
---

# UI/UX Pro Max — React + Hono Design Intelligence

Unified design skill for polishing React + Hono web apps. Covers design intelligence, shadcn/ui + Tailwind components, design tokens, brand, logo, banner, and icon design.

---

## When to Apply

Use when the task involves **UI structure, visual design decisions, interaction patterns, or user experience quality control**.

**Must Use:** Designing pages, creating/refactoring components, choosing colors/typography/layout, reviewing UI code for UX/accessibility, implementing navigation/animations/responsive behavior, product-level design decisions.

**Skip:** Pure backend logic, API/database-only work, infrastructure/DevOps, non-visual scripts.

---

## Rule Priority Table

| Priority | Category | Impact | Key Checks | Anti-Patterns |
|----------|----------|--------|------------|---------------|
| 1 | Accessibility | CRITICAL | Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels | Removing focus rings, Icon-only buttons without labels |
| 2 | Touch & Interaction | CRITICAL | Min 44×44px, 8px+ spacing, Loading feedback | Hover-only reliance, Instant state changes (0ms) |
| 3 | Performance | HIGH | WebP/AVIF, Lazy loading, CLS < 0.1 | Layout thrashing, Cumulative Layout Shift |
| 4 | Style Selection | HIGH | Match product type, Consistency, SVG icons | Mixing flat & skeuomorphic randomly, Emoji as icons |
| 5 | Layout & Responsive | HIGH | Mobile-first, Viewport meta, No horizontal scroll | Fixed px widths, Disable zoom |
| 6 | Typography & Color | MEDIUM | Base 16px, Line-height 1.5, Semantic tokens | Text < 12px, Gray-on-gray, Raw hex in components |
| 7 | Animation | MEDIUM | 150–300ms, Motion conveys meaning | Decorative-only, Animating width/height, No reduced-motion |
| 8 | Forms & Feedback | MEDIUM | Visible labels, Error near field, Progressive disclosure | Placeholder-only label, Errors only at top |
| 9 | Navigation | HIGH | Predictable back, Bottom nav ≤5, Deep linking | Overloaded nav, Broken back behavior |
| 10 | Charts & Data | LOW | Legends, Tooltips, Accessible colors | Color-only data meaning |

---

## Quick Reference Rules

### 1. Accessibility (CRITICAL)
- `color-contrast` — Min 4.5:1 for normal text (3:1 large text)
- `focus-states` — Visible focus rings on all interactive elements (2–4px)
- `alt-text` — Descriptive alt text for meaningful images
- `aria-labels` — aria-label for icon-only buttons
- `keyboard-nav` — Tab order matches visual order; full keyboard support
- `form-labels` — Use `<label for>` attribute
- `skip-links` — Skip to main content for keyboard users
- `heading-hierarchy` — Sequential h1→h6, no level skip
- `color-not-only` — Don't convey info by color alone (add icon/text)
- `reduced-motion` — Respect `prefers-reduced-motion`

### 2. Touch & Interaction (CRITICAL)
- `touch-target-size` — Min 44×44px; extend hit area beyond visual bounds if needed
- `touch-spacing` — Minimum 8px gap between touch targets
- `hover-vs-tap` — Use click/tap for primary; don't rely on hover alone
- `loading-buttons` — Disable button during async; show spinner/progress
- `error-feedback` — Clear error messages near problem
- `cursor-pointer` — Add `cursor-pointer` to clickable elements
- `tap-delay` — Use `touch-action: manipulation` to reduce 300ms delay
- `press-feedback` — Visual feedback on press (ripple/highlight)

### 3. Performance (HIGH)
- `image-optimization` — WebP/AVIF, responsive images (srcset/sizes), lazy load
- `image-dimension` — Declare width/height or aspect-ratio to prevent CLS
- `font-loading` — Use `font-display: swap/optional` to avoid FOIT
- `lazy-loading` — Lazy load non-hero components via dynamic import
- `bundle-splitting` — Split code by route/feature (React Suspense / Next.js dynamic)
- `virtualize-lists` — Virtualize lists with 50+ items
- `debounce-throttle` — Debounce/throttle high-frequency events (scroll, resize, input)
- `progressive-loading` — Skeleton screens / shimmer for >1s operations

### 4. Style Selection (HIGH)
- `style-match` — Match style to product type
- `consistency` — Same style across all pages
- `no-emoji-icons` — Use SVG icons (Heroicons, Lucide), not emojis
- `effects-match-style` — Shadows, blur, radius aligned with chosen style
- `dark-mode-pairing` — Design light/dark variants together
- `icon-style-consistent` — One icon set/visual language throughout
- `primary-action` — One primary CTA per screen; secondary actions visually subordinate

### 5. Layout & Responsive (HIGH)
- `viewport-meta` — `width=device-width initial-scale=1` (never disable zoom)
- `mobile-first` — Design mobile-first, scale up to tablet/desktop
- `breakpoint-consistency` — Systematic breakpoints: 375 / 768 / 1024 / 1440
- `readable-font-size` — Minimum 16px body text on mobile (avoids iOS auto-zoom)
- `horizontal-scroll` — No horizontal scroll on mobile
- `spacing-scale` — 4pt/8dp incremental spacing system
- `container-width` — Consistent max-width on desktop (max-w-6xl / 7xl)
- `z-index-management` — Layered z-index scale (0 / 10 / 20 / 40 / 100 / 1000)

### 6. Typography & Color (MEDIUM)
- `line-height` — 1.5–1.75 for body text
- `line-length` — 65–75 characters per line on desktop
- `font-pairing` — Match heading/body font personalities
- `font-scale` — Consistent type scale (12 14 16 18 24 32)
- `color-semantic` — Semantic color tokens (primary, secondary, error, surface) not raw hex
- `color-dark-mode` — Dark mode uses desaturated/lighter tonal variants, not inverted colors
- `color-accessible-pairs` — Foreground/background pairs must meet 4.5:1 (AA)
- `weight-hierarchy` — Bold headings (600–700), Regular body (400), Medium labels (500)
- `whitespace-balance` — Use whitespace to group related items and separate sections

### 7. Animation (MEDIUM)
- `duration-timing` — 150–300ms for micro-interactions; complex ≤400ms; never >500ms
- `transform-performance` — Use `transform`/`opacity` only; avoid `width`/`height`/`top`/`left`
- `loading-states` — Skeleton or progress indicator when loading > 300ms
- `easing` — `ease-out` for entering, `ease-in` for exiting; never linear for UI
- `spring-physics` — Prefer spring/physics-based curves for natural feel
- `exit-faster-than-enter` — Exit ~60–70% duration of enter
- `interruptible` — Animations must be interruptible by user tap/gesture

### 8. Forms & Feedback (MEDIUM)
- `input-labels` — Visible label per input (not placeholder-only)
- `error-placement` — Show error below the related field
- `submit-feedback` — Loading → success/error state on submit
- `empty-states` — Helpful message and action when no content
- `inline-validation` — Validate on blur (not keystroke)
- `input-type-keyboard` — Semantic input types (`email`, `tel`, `number`)
- `progressive-disclosure` — Reveal complex options progressively
- `error-clarity` — Error messages must state cause + how to fix
- `undo-support` — Allow undo for destructive/bulk actions

### 9. Navigation Patterns (HIGH)
- `back-behavior` — Predictable and consistent; preserve scroll/state
- `deep-linking` — All key screens reachable via URL
- `nav-state-active` — Current location highlighted in navigation
- `modal-escape` — Clear close/dismiss affordance on all modals
- `breadcrumb-web` — Use breadcrumbs for 3+ level deep hierarchies
- `adaptive-navigation` — ≥1024px prefer sidebar; small screens use top nav
- `back-stack-integrity` — Never silently reset navigation stack

### 10. Charts & Data (LOW)
- `chart-type` — Match chart to data (trend → line, comparison → bar, proportion → donut)
- `legend-visible` — Always show legend near the chart
- `tooltip-on-interact` — Tooltips on hover showing exact values
- `responsive-chart` — Reflow/simplify on small screens
- `empty-data-state` — Meaningful empty state with guidance
- `no-pie-overuse` — Avoid pie/donut for >5 categories; use bar

---

## Search Commands

```bash
# Full design system (start here)
python3 src/ui-ux-pro-max/scripts/search.py "<product> <keywords>" --design-system -p "Project Name"

# Domain search
python3 src/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>

# Stack search
python3 src/ui-ux-pro-max/scripts/search.py "<query>" --stack react
```

**Domains:** `product` · `style` · `typography` · `color` · `landing` · `chart` · `ux` · `google-fonts` · `react`

**Stacks:** `react` · `nextjs` · `html-tailwind` · `shadcn` · `vue` · `svelte` · `astro`

---

## Workflow

### Step 1: Analyze Requirements
- Product type, target audience, style keywords, stack (React + Hono)

### Step 2: Generate Design System
```bash
python3 src/ui-ux-pro-max/scripts/search.py "saas dashboard modern" --design-system -p "MyApp"
```

### Step 3: Supplement with Domain Searches
```bash
python3 src/ui-ux-pro-max/scripts/search.py "glassmorphism dark" --domain style
python3 src/ui-ux-pro-max/scripts/search.py "form validation accessibility" --domain ux
python3 src/ui-ux-pro-max/scripts/search.py "analytics dashboard real-time" --domain chart
```

### Step 4: Stack-Specific Guidance
```bash
python3 src/ui-ux-pro-max/scripts/search.py "performance bundle suspense" --stack react
```

---

## shadcn/ui + Tailwind (React)

### Setup
```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog form table
```

### Component Quick Reference

**Card + Button:**
```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function DashboardCard() {
  return (
    <div className="container mx-auto p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">View your metrics</p>
          <Button variant="default" className="w-full">View Details</Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Form with validation:**
```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export function LoginForm() {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)} className="space-y-6">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full">Sign In</Button>
      </form>
    </Form>
  )
}
```

**Responsive layout with dark mode:**
```tsx
<div className="min-h-screen bg-white dark:bg-gray-900">
  <div className="container mx-auto px-4 py-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Content</h3>
        </CardContent>
      </Card>
    </div>
  </div>
</div>
```

### Tailwind Best Practices
- **Utility-first**: Use Tailwind classes directly; extract only for true repetition
- **Mobile-first**: Start with mobile styles, layer responsive variants (sm: md: lg:)
- **Spacing rhythm**: Use multiples of 4 (p-4, p-8, gap-6)
- **Dark mode**: Apply `dark:` variants to all themed elements
- **Arbitrary values**: Use `[]` syntax for one-off values (`w-[340px]`, `bg-[#1a1a1a]`)

### Tailwind Vite Setup
```bash
npm install -D tailwindcss @tailwindcss/vite
```
```javascript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
export default { plugins: [tailwindcss()] }
```
```css
/* src/index.css */
@import "tailwindcss";
```

---

## Design Token Architecture

### Three-Layer Structure
```
Primitive (raw values)
       ↓
Semantic (purpose aliases)
       ↓
Component (component-specific)
```

```css
/* Primitive */
--color-blue-600: #2563EB;

/* Semantic */
--color-primary: var(--color-blue-600);
--color-error: var(--color-red-500);
--color-surface: var(--color-gray-50);

/* Component */
--button-bg: var(--color-primary);
--input-border-error: var(--color-error);
```

### Token Rules
1. **Never use raw hex in components** — always reference tokens
2. **Semantic layer** enables theme switching (light/dark)
3. **Component tokens** enable per-component customization
4. Use **HSL format** for opacity control: `hsl(var(--primary) / 0.1)`
5. Document every token's purpose

### Tailwind Theme Config
```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))",
        destructive: "hsl(var(--destructive))",
        muted: "hsl(var(--muted))",
        accent: "hsl(var(--accent))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      }
    }
  }
}
```

### Generate Tokens
```bash
node .claude/skills/design-system/scripts/generate-tokens.cjs --config tokens.json -o tokens.css
node .claude/skills/design-system/scripts/validate-tokens.cjs --dir src/
```

---

## Brand System

### Brand Sync Workflow
```bash
# 1. Edit docs/brand-guidelines.md
# 2. Sync to design tokens
node .claude/skills/brand/scripts/sync-brand-to-tokens.cjs
# 3. Inject brand context into prompts
node .claude/skills/brand/scripts/inject-brand-context.cjs
# 4. Validate an asset
node .claude/skills/brand/scripts/validate-asset.cjs <asset-path>
```

**Files synced:**
- `docs/brand-guidelines.md` → Source of truth
- `assets/design-tokens.json` → Token definitions
- `assets/design-tokens.css` → CSS variables

### Brand Components
| Component | Description |
|-----------|-------------|
| Voice Framework | Tone, personality, writing rules |
| Visual Identity | Logo usage, color, typography standards |
| Messaging Framework | Value prop, taglines, positioning |
| Consistency Checklist | Cross-asset review rules |

References: `.claude/skills/brand/references/`

---

## Logo & Icon Design

### Logo: Generate Design Brief
```bash
python3 .claude/skills/design/scripts/logo/search.py "tech startup modern" --design-brief -p "BrandName"
python3 .claude/skills/design/scripts/logo/search.py "minimalist clean" --domain style
python3 .claude/skills/design/scripts/logo/search.py "tech professional" --domain color
```

### Logo: Generate with Gemini AI
```bash
python3 .claude/skills/design/scripts/logo/generate.py --brand "TechFlow" --style minimalist --industry tech
```
**Setup:** `export GEMINI_API_KEY="your-key"` + `pip install google-genai pillow`

**Always:** Generate logos with white background. Ask user about HTML preview after generation.

### Logo Styles Quick Reference
| Style | Best For |
|-------|----------|
| Minimalist | SaaS, tech tools |
| Geometric | Fintech, enterprise |
| Wordmark | B2B, consulting |
| Lettermark | Startups, apps |
| Badge | F&B, retail, craft |
| Abstract | Creative, agency |

### Icon Design
```bash
python3 .claude/skills/design/scripts/icon/generate.py --prompt "settings gear" --style outlined
python3 .claude/skills/design/scripts/icon/generate.py --prompt "dashboard" --style duotone --color "#6366F1"
python3 .claude/skills/design/scripts/icon/generate.py --prompt "cloud upload" --batch 4 --output-dir ./icons
```

| Style | Best For |
|-------|----------|
| outlined | Web apps, interfaces |
| filled | Mobile, nav bars |
| duotone | Marketing, landing pages |
| rounded | Friendly apps |
| sharp | Enterprise, fintech |
| gradient | Modern SaaS |

---

## Banner Design

### Platform Size Quick Reference
| Platform | Type | Size (px) | Aspect Ratio |
|----------|------|-----------|--------------|
| Facebook | Cover | 820 × 312 | ~2.6:1 |
| Twitter/X | Header | 1500 × 500 | 3:1 |
| LinkedIn | Personal | 1584 × 396 | 4:1 |
| YouTube | Channel | 2560 × 1440 | 16:9 |
| Instagram | Story | 1080 × 1920 | 9:16 |
| Instagram | Post | 1080 × 1080 | 1:1 |
| Google Ads | Med Rectangle | 300 × 250 | 6:5 |
| Website | Hero | 1920 × 600–1080 | ~3:1 |

### Art Direction Styles
| Style | Best For | Key Elements |
|-------|----------|--------------|
| Minimalist | SaaS, tech | White space, 1–2 colors, clean type |
| Bold Typography | Announcements | Oversized type as hero element |
| Gradient | Modern brands | Mesh gradients, chromatic blends |
| Photo-Based | Lifestyle, e-com | Full-bleed photo + text overlay |
| Geometric | Tech, fintech | Shapes, grids, abstract patterns |
| Glassmorphism | SaaS, apps | Frosted glass, blur, glow borders |
| Neon/Cyberpunk | Gaming, events | Dark bg, glowing neon accents |
| Editorial | Media, luxury | Grid layouts, pull quotes |

### Banner Design Rules
- **Safe zones**: Critical content in central 70–80%
- **CTA**: One per banner, bottom-right, min 44px height, action verb
- **Typography**: Max 2 fonts, min 16px body, ≥32px headline
- **Text ratio**: Under 20% for ads (Meta penalizes heavy text)
- **Print**: 300 DPI, CMYK, 3–5mm bleed

---

## Social Photos Quick Reference

| Platform | Size (px) | Platform | Size (px) |
|----------|-----------|----------|-----------|
| IG Post | 1080×1080 | FB Post | 1200×630 |
| IG Story | 1080×1920 | X Post | 1200×675 |
| IG Carousel | 1080×1350 | LinkedIn | 1200×627 |
| YT Thumb | 1280×720 | Pinterest | 1000×1500 |

---

## CIP Design (Corporate Identity)

50+ deliverables, 20 styles, 20 industries. Gemini AI generation.

```bash
# Generate brief
python3 .claude/skills/design/scripts/cip/search.py "tech startup" --cip-brief -b "BrandName"

# Generate mockups (with logo recommended)
python3 .claude/skills/design/scripts/cip/generate.py --brand "TopGroup" --logo /path/to/logo.png \
  --deliverable "business card" --industry "consulting"

# Full CIP set
python3 .claude/skills/design/scripts/cip/generate.py --brand "TopGroup" --logo logo.png \
  --industry "consulting" --set
```

---

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis used as icons (SVG only)
- [ ] All icons from a consistent icon family and style
- [ ] Semantic theme tokens used consistently (no hardcoded hex in components)
- [ ] Pressed-state visuals don't shift layout bounds

### Interaction
- [ ] All tappable elements provide clear pressed feedback
- [ ] Touch targets meet minimum 44×44px
- [ ] Micro-interaction timing: 150–300ms with natural easing
- [ ] Disabled states visually clear and non-interactive

### Light/Dark Mode
- [ ] Primary text contrast ≥4.5:1 in both light and dark mode
- [ ] Secondary text contrast ≥3:1 in both modes
- [ ] Dividers/borders distinguishable in both modes

### Layout
- [ ] No horizontal scroll on mobile
- [ ] Content not hidden behind fixed/sticky bars
- [ ] Verified at 375px (small phone) and 1440px (desktop)
- [ ] 4/8px spacing rhythm maintained

### Accessibility
- [ ] All meaningful images/icons have aria-labels
- [ ] Form fields have labels, hints, clear error messages
- [ ] Color is not the only indicator of state/meaning
- [ ] Reduced motion supported

---

## Common Sticking Points

| Problem | Fix |
|---------|-----|
| Can't decide on style/color | Run `--design-system` with different keywords |
| Dark mode contrast issues | Check `color-dark-mode` + `color-accessible-pairs` rules |
| Animations feel unnatural | Apply `spring-physics` + `exit-faster-than-enter` |
| Form UX is poor | Apply `inline-validation` + `error-clarity` + `focus-management` |
| Navigation feels confusing | Apply `nav-hierarchy` + `back-behavior` |
| Layout breaks on mobile | Apply `mobile-first` + `breakpoint-consistency` |
| Performance / jank | Apply `virtualize-lists` + `debounce-throttle` |

---

## Reference Files

| Skill Area | References Location |
|------------|-------------------|
| shadcn/ui components | `.claude/skills/ui-styling/references/` |
| Design tokens | `.claude/skills/design-system/references/` |
| Brand voice & identity | `.claude/skills/brand/references/` |
| Logo styles & prompts | `.claude/skills/design/references/logo-*.md` |
| CIP deliverables | `.claude/skills/design/references/cip-*.md` |
| Banner sizes & styles | `.claude/skills/design/references/banner-*.md` |
| Icon design | `.claude/skills/design/references/icon-design.md` |
| Search data (CSV) | `src/ui-ux-pro-max/data/` |
| Stack guidelines | `src/ui-ux-pro-max/data/stacks/` |

# Task: Update index.html — Add i18n Support + Docs Link

## Context
The `i18n.js` file is ready at `D:\qwen-bridge\i18n.js`. It contains all bilingual text. Now update `index.html` to use it.

## Instructions — make these EXACT changes:

### 1. Add i18n script before `</head>`

Find the line `</head>` in index.html. Insert BEFORE it:

```html
<script src="i18n.js"></script>
```

### 2. Add language toggle button to navbar

Find the navbar section. The last item before the closing `</nav>` tag should be a Get Started link. BEFORE the Get Started link, add:

```html
<button id="lang-toggle" onclick="switchLang(currentLang==='zh'?'en':'zh')" class="text-sm font-medium text-on-surface-variant hover:text-primary-container transition-all duration-300 px-3 py-1.5 rounded-lg hover:bg-white/10">EN</button>
```

### 3. Add Docs link to navbar

After the "GitHub" nav link, add:

```html
<a class="text-on-surface-variant hover:text-primary-container transition-all duration-300" href="https://github.com/zhewenzhang/AutoClaude/tree/main/docs" target="_blank" data-i18n="nav_docs">Docs</a>
```

### 4. Add data-i18n attributes to ALL text elements

Go through EVERY visible text in index.html and add `data-i18n="KEY"` where KEY matches the keys in i18n.js. Use the EXACT keys from i18n.js:

- Hero section: `hero_line1`, `hero_line2`, `hero_sub`, `hero_cta`, `hero_github`
- How It Works: `how_title`, `how_sub`, `how_step1_title`, `how_step1_desc`, `how_step2_title`, `how_step2_desc`, `how_step3_title`, `how_step3_desc`
- Process: `process_title`, `process_sub`, `process_tier_a`, `process_tier_b`, `process_tier_c`, `process_claude`, `process_claude_desc`, `process_ac`, `process_ac_desc`, `process_agent`, `process_agent_desc`
- Savings: `savings_title`, `savings_sub`, `savings_t1_title`, `savings_t1_desc`, `savings_t2_title`, `savings_t2_desc`, `savings_t3_title`, `savings_t3_desc`, `savings_footer`
- Agents: `agents_title`, `agents_sub`, `agents_footer`
- Features: `features_title`, `features_sub`, `f1_title`, `f1_desc`, `f2_title`, `f2_desc`, `f3_title`, `f3_desc`, `f4_title`, `f4_desc`, `f5_title`, `f5_desc`, `f6_title`, `f6_desc`
- Quote: `quote`
- Getting Started: `getting_title`, `getting_sub`, `step1_label`, `step2_label`, `step3_label`
- Navbar: `nav_features`, `nav_how`, `nav_process`, `nav_savings`, `nav_agents`, `nav_github`, `nav_start`
- Footer: `footer_features`, `footer_how`, `footer_github`, `footer_docs`, `footer_copyright`

IMPORTANT RULES:
- Agent names (Qwen Code, Gemini CLI, etc.) should NOT get data-i18n — they're proper nouns
- Technical terms (YOLO, CLI, Opus 4.7) should NOT get data-i18n
- Code examples in the Getting Started section should NOT be translated
- The GitHub clone URL should NOT be translated

For text that contains HTML (like `<br/>`), use `innerHTML` — the i18n system already uses `innerHTML`.

### 5. Add CSS for toggle

Add before `</style>`:
```css
#lang-toggle { min-width: 48px; text-align: center; transition: all 0.2s ease; }
#lang-toggle:hover { background: rgba(49,168,255,0.1); color: #31a8ff; }
```

### 6. Verify

Check that `grep -c "data-i18n" index.html` returns at least 40.

### 7. Commit and Push

```bash
cd D:\qwen-bridge
git add -A
git commit -m "v5.1: Bilingual landing page (EN/中文) + GitHub docs + i18n system"
git push origin main
```

#!/usr/bin/env node
/**
 * md-to-epub.mjs
 *
 * Compiles all Markdown files in the project root into a single EPUB with a
 * table of contents, saves to ~/Downloads, and optionally emails it.
 *
 * Usage:
 *   node scripts/md-to-epub.mjs [--title "Book Title"] [--author "Author"] [--email user@example.com]
 *
 * Or pass specific files:
 *   node scripts/md-to-epub.mjs file1.md file2.md [--title "Book Title"]
 *
 * Email modes (auto-detected):
 *   1. If GMAIL_APP_PASSWORD env var is set → sends via nodemailer (fully automated)
 *   2. Otherwise → opens default mail client via PowerShell with the file attached (Windows)
 *
 * Setup for Gmail sending:
 *   1. Enable 2-Factor Auth on your Google account
 *   2. Go to myaccount.google.com → Security → App Passwords
 *   3. Generate a password for "Mail"
 *   4. Set env vars:
 *        GMAIL_USER=you@gmail.com
 *        GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { basename, join, resolve, dirname } from 'path';
import { homedir } from 'os';
import { execSync, exec } from 'child_process';
import { parseArgs } from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    email: { type: 'string', short: 'e' },
    title: { type: 'string', short: 't' },
    author: { type: 'string', short: 'a' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(`
Usage: node scripts/md-to-epub.mjs [files...] [options]

If no files are specified, all *.md files in the project root are included.

Options:
  -e, --email <addr>    Email address to send the EPUB to
  -t, --title <title>   Book title  (default: directory name)
  -a, --author <name>   Author name (default: "Unknown")
  -h, --help            Show this help

Email env vars (for auto-send via Gmail):
  GMAIL_USER            Your Gmail address
  GMAIL_APP_PASSWORD    App password (see Google "App Passwords")
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Collect MD files
// ---------------------------------------------------------------------------
let mdFiles;

if (positionals.length > 0) {
  mdFiles = positionals.map((p) => resolve(p));
} else {
  // All .md files in project root, excluding config files
  const exclude = new Set(['CLAUDE.md', 'AGENTS.md', 'README.md']);
  mdFiles = readdirSync(projectRoot)
    .filter((f) => f.endsWith('.md') && !exclude.has(f))
    .sort()
    .map((f) => join(projectRoot, f));
}

if (mdFiles.length === 0) {
  console.error('No markdown files found.');
  process.exit(1);
}

const title = values.title || basename(projectRoot);
const author = values.author || 'Unknown';
const email = values.email;

console.log(`Compiling ${mdFiles.length} markdown file(s) into EPUB...`);
mdFiles.forEach((f) => console.log(`  - ${basename(f)}`));

// ---------------------------------------------------------------------------
// Step 1 — Install epub-gen-memory if needed
// ---------------------------------------------------------------------------
let EPub;
try {
  EPub = (await import('epub-gen-memory')).EPub;
} catch {
  console.log('Installing epub-gen-memory...');
  execSync('npm install --no-save epub-gen-memory', { stdio: 'inherit' });
  EPub = (await import('epub-gen-memory')).EPub;
}

// ---------------------------------------------------------------------------
// Step 2 — Parse each MD file into chapters
// ---------------------------------------------------------------------------
const chapters = [];

for (const filePath of mdFiles) {
  const markdown = readFileSync(filePath, 'utf-8');
  const fileTitle = basename(filePath, '.md').replace(/[_-]/g, ' ');

  // Split on "# " headings
  const chapterRegex = /^# (.+)$/gm;
  const headings = [];
  let match;

  while ((match = chapterRegex.exec(markdown)) !== null) {
    headings.push({ title: match[1], index: match.index });
  }

  if (headings.length > 0) {
    // Content before first heading
    const preamble = markdown.slice(0, headings[0].index).trim();
    if (preamble) {
      chapters.push({ title: fileTitle, content: markdownToHtml(preamble) });
    }

    for (let i = 0; i < headings.length; i++) {
      const start = headings[i].index + headings[i].title.length + 2;
      const end = i + 1 < headings.length ? headings[i + 1].index : markdown.length;
      const body = markdown.slice(start, end).trim();
      chapters.push({ title: headings[i].title, content: markdownToHtml(body) });
    }
  } else {
    chapters.push({ title: fileTitle, content: markdownToHtml(markdown) });
  }
}

// ---------------------------------------------------------------------------
// Step 3 — Build TOC chapter
// ---------------------------------------------------------------------------
const tocHtml = [
  '<h1>Table of Contents</h1>',
  '<nav>',
  '<ol>',
  ...chapters.map((ch, i) => `  <li>${esc(ch.title)}</li>`),
  '</ol>',
  '</nav>',
].join('\n');

chapters.unshift({ title: 'Table of Contents', content: tocHtml });

// ---------------------------------------------------------------------------
// Step 4 — Generate EPUB
// ---------------------------------------------------------------------------
const epub = new EPub({ title, author, tocTitle: 'Table of Contents' }, chapters);
const epubBuffer = await epub.genEpub();

const outName = title.replace(/[<>:"/\\|?*]/g, '_') + '.epub';
const downloadsDir = join(homedir(), 'Downloads');
const outPath = join(downloadsDir, outName);

writeFileSync(outPath, epubBuffer);
console.log(`\nEPUB saved to: ${outPath}`);
console.log(`  ${chapters.length - 1} chapters + TOC`);

// ---------------------------------------------------------------------------
// Step 5 — Email
// ---------------------------------------------------------------------------
if (email) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (gmailUser && gmailPass) {
    await sendWithNodemailer(outPath, outName, email, gmailUser, gmailPass);
  } else {
    await openMailClient(outPath, email);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal markdown → HTML */
function markdownToHtml(md) {
  let html = md
    // code blocks
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      (_m, _lang, code) => `<pre><code>${esc(code.trim())}</code></pre>`,
    )
    // inline code
    .replace(/`([^`]+)`/g, (_m, code) => `<code>${esc(code)}</code>`)
    // headings (## through ######)
    .replace(/^#{2,6}\s+(.+)$/gm, (_m, text) => {
      const level = _m.match(/^#+/)[0].length;
      return `<h${level}>${text}</h${level}>`;
    })
    // bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    // horizontal rules
    .replace(/^---+$/gm, '<hr />')
    // unordered list items
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Paragraphs: wrap remaining non-tag lines
  html = html
    .split('\n\n')
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('<')) return block;
      return `<p>${block.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Send email via nodemailer + Gmail SMTP */
async function sendWithNodemailer(filePath, fileName, to, user, pass) {
  let nodemailer;
  try {
    nodemailer = await import('nodemailer');
  } catch {
    console.log('Installing nodemailer...');
    execSync('npm install --no-save nodemailer', { stdio: 'inherit' });
    nodemailer = await import('nodemailer');
  }

  const transporter = nodemailer.default.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  console.log(`Sending "${fileName}" to ${to}...`);

  await transporter.sendMail({
    from: user,
    to,
    subject: `EPUB: ${title}`,
    text: `Your EPUB "${title}" is attached.`,
    attachments: [{ filename: fileName, path: filePath }],
  });

  console.log('Email sent successfully.');
}

/** Fallback: open default mail client with the file (Windows) */
async function openMailClient(filePath, to) {
  const platform = process.platform;

  if (platform === 'win32') {
    const ps = `
      try {
        $outlook = New-Object -ComObject Outlook.Application
        $mail = $outlook.CreateItem(0)
        $mail.To = '${to}'
        $mail.Subject = 'EPUB: ${title.replace(/'/g, "''")}'
        $mail.Body = 'Your EPUB is attached.'
        $mail.Attachments.Add('${filePath.replace(/\//g, '\\').replace(/'/g, "''")}')
        $mail.Display()
        Write-Output 'OUTLOOK_OK'
      } catch {
        Write-Output 'OUTLOOK_FAIL'
      }
    `;

    try {
      const result = execSync(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
      }).trim();

      if (result.includes('OUTLOOK_OK')) {
        console.log('Opened Outlook compose window with attachment.');
        return;
      }
    } catch {
      /* fall through */
    }

    console.log('Outlook not available. Opening Gmail compose in browser...');
    const subject = encodeURIComponent(`EPUB: ${title}`);
    const body = encodeURIComponent(
      `Your EPUB "${title}" is attached.\n\nFile location: ${filePath}`,
    );
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${subject}&body=${body}`;

    exec(`start "" "${gmailUrl}"`);
    exec(`explorer /select,"${filePath.replace(/\//g, '\\')}"`);
    console.log(
      `Gmail compose opened. File explorer opened with "${outName}" selected — drag it into the email.`,
    );
  } else if (platform === 'darwin') {
    const subject = encodeURIComponent(`EPUB: ${title}`);
    const body = encodeURIComponent(`Your EPUB "${title}" is attached.`);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${subject}&body=${body}`;
    exec(`open "${gmailUrl}"`);
    exec(`open -R "${filePath}"`);
    console.log('Gmail compose opened. Finder revealed the file — drag it into the email.');
  } else {
    const subject = encodeURIComponent(`EPUB: ${title}`);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${subject}`;
    exec(`xdg-open "${gmailUrl}"`);
    console.log(`Gmail compose opened. Attach manually from: ${filePath}`);
  }
}

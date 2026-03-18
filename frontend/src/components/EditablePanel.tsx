// EditablePanel.tsx — Rich text editor for output documents
//
// Replaces the read-only MarkdownPanel with a Tiptap editor so users
// can tweak AI-generated content before exporting. Includes:
//   - Formatting toolbar (bold, italic, headings, lists, etc.)
//   - Copy button (copies formatted HTML + plain text)
//   - Export PDF button (renders a professional print template)
//
// Tiptap is a headless editor built on ProseMirror. "Headless" means
// it handles the editing logic but we control all the UI/styling.

"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import { toast } from "sonner";

// Configure marked to return strings synchronously (v17 defaults to async)
// Without this, marked.parse() returns a Promise and we'd get "[object Promise]"
marked.use({ async: false });

interface EditablePanelProps {
  content: string; // Raw markdown from the backend
  label?: string; // Tab label shown above the editor
}

// ── Markdown → HTML conversion ──
// Tiptap works with HTML internally, so we convert the markdown output
// from the backend into HTML before loading it into the editor.
function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { gfm: true, breaks: true }) as string;
}

export default function EditablePanel({ content, label }: EditablePanelProps) {
  const [copied, setCopied] = useState(false);

  // Convert the markdown content to HTML once on mount
  const html = markdownToHtml(content);

  // Initialize the Tiptap editor
  // StarterKit bundles: Bold, Italic, Strike, Code, Headings, Lists,
  //   Blockquote, CodeBlock, HorizontalRule, History (undo/redo)
  const editor = useEditor({
    extensions: [StarterKit],
    content: html,
    // Prevent hydration mismatch — don't render on server
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // Apply Tailwind prose classes matching the app's semantic design tokens
        class:
          "prose prose-invert prose-sm max-w-[65ch] min-h-[200px] p-4 focus:outline-none " +
          "prose-headings:text-text-primary prose-headings:font-semibold " +
          "prose-p:text-text-secondary prose-p:leading-relaxed " +
          "prose-strong:text-text-primary prose-li:text-text-secondary " +
          "prose-a:text-accent prose-a:no-underline hover:prose-a:underline " +
          "prose-code:text-accent prose-code:text-xs " +
          "prose-pre:bg-surface-raised prose-pre:border prose-pre:border-border " +
          "prose-th:text-text-primary prose-td:text-text-secondary " +
          "prose-hr:border-border",
      },
    },
  });

  // ── Copy handler ──
  // Writes both HTML and plain text to clipboard. When pasting into
  // Google Docs/Notion, the HTML version preserves formatting.
  async function handleCopy() {
    if (!editor) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([editor.getHTML()], { type: "text/html" }),
          "text/plain": new Blob([editor.getText()], { type: "text/plain" }),
        }),
      ]);
    } catch {
      // Fallback for browsers that don't support ClipboardItem
      await navigator.clipboard.writeText(editor.getText());
    }
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  // ── PDF Export handler ──
  // Creates a hidden iframe with the professionally styled content,
  // then triggers the browser's print dialog (user can "Save as PDF").
  function handleExportPDF() {
    if (!editor) return;

    const printHtml = buildPrintDocument(editor.getHTML(), label);

    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:none;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(printHtml);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      toast.success("PDF export opened");
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
  }

  // Editor hasn't initialized yet (SSR or first render)
  if (!editor) return null;

  return (
    <div>
      {/* ── Action bar: label + copy/export buttons ── */}
      <div className="flex items-center justify-between mb-5">
        {label && (
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
            {label}
          </h3>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 rounded-md text-text-muted
                       hover:text-text-secondary hover:bg-surface-overlay
                       transition-all duration-150"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleExportPDF}
            className="text-xs px-2.5 py-1 rounded-md bg-accent text-white
                       hover:bg-accent-hover transition-all duration-150"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Formatting toolbar ── */}
      <Toolbar editor={editor} />

      {/* ── Editor content area ── */}
      <div className="border border-border border-t-0 rounded-b-md">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ── Toolbar Component ──
// A row of formatting buttons that call Tiptap commands.
// Each button highlights when its format is active at the cursor position.

function Toolbar({ editor }: { editor: Editor }) {
  function ToolbarButton({
    isActive,
    onClick,
    children,
  }: {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) {
    return (
      <button
        onClick={onClick}
        className={`px-2 py-1 text-xs rounded-md transition-all duration-150
          ${
            isActive
              ? "bg-surface-overlay text-text-primary"
              : "text-text-muted hover:text-text-secondary hover:bg-surface-raised"
          }`}
      >
        {children}
      </button>
    );
  }

  function Sep() {
    return <div className="w-px h-4 bg-border mx-1" />;
  }

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 bg-surface-raised border border-border rounded-t-md">
      {/* Text formatting */}
      <ToolbarButton
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolbarButton>

      <Sep />

      {/* Headings */}
      <ToolbarButton
        isActive={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>

      <Sep />

      {/* Lists and blocks */}
      <ToolbarButton
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        List
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Quote
      </ToolbarButton>

      <Sep />

      {/* Undo / Redo */}
      <ToolbarButton
        isActive={false}
        onClick={() => editor.chain().focus().undo().run()}
      >
        Undo
      </ToolbarButton>
      <ToolbarButton
        isActive={false}
        onClick={() => editor.chain().focus().redo().run()}
      >
        Redo
      </ToolbarButton>
    </div>
  );
}

// ── PDF Print Template ──
// Generates a complete HTML document styled for printing.
// When the browser prints this, the output is a clean, professional PDF.

function buildPrintDocument(content: string, title?: string): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title || "Document"}</title>
<style>
  @page {
    margin: 1in 1.25in;
    size: letter;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1f2937;
    line-height: 1.75;
    font-size: 11pt;
    padding-top: 20px;
  }

  .doc-header {
    margin-bottom: 36px;
    padding-bottom: 20px;
    border-bottom: 2px solid #2563eb;
  }
  .doc-title {
    font-size: 26pt;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-bottom: 6px;
  }
  .doc-meta {
    font-size: 9pt;
    color: #6b7280;
    letter-spacing: 0.02em;
  }

  h1 {
    font-size: 18pt;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.01em;
    margin: 32px 0 12px;
    line-height: 1.3;
  }
  h2 {
    font-size: 10pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #2563eb;
    margin: 28px 0 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
  }
  h3 {
    font-size: 12pt;
    font-weight: 600;
    color: #374151;
    margin: 20px 0 8px;
  }

  p { margin: 8px 0; }

  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 4px 0; }
  li::marker { color: #2563eb; }

  strong { font-weight: 600; color: #111827; }
  em { color: #4b5563; }

  blockquote {
    border-left: 3px solid #2563eb;
    padding-left: 16px;
    margin: 16px 0;
    color: #4b5563;
    font-style: italic;
  }

  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 24px 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 10pt;
  }
  th {
    font-weight: 600;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    padding: 10px 12px;
    border-bottom: 2px solid #e5e7eb;
    text-align: left;
  }
  td {
    padding: 10px 12px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }
  tr:last-child td { border-bottom: none; }

  code {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 9pt;
    background: #f3f4f6;
    padding: 1px 4px;
    border-radius: 3px;
  }
  pre {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px 16px;
    margin: 12px 0;
    overflow-x: auto;
    font-size: 9pt;
    line-height: 1.6;
  }
  pre code { background: none; padding: 0; }

  .doc-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 8pt;
    color: #9ca3af;
    padding: 8px 0;
  }
</style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-title">${title || "Document"}</div>
    <div class="doc-meta">Prepared by Flowsor LLC &mdash; ${date}</div>
  </div>
  ${content}
  <div class="doc-footer">Prepared by Flowsor</div>
</body>
</html>`;
}

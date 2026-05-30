"use client"

import { useState, useRef, useCallback } from "react"
import {
  EditorRoot, EditorContent, EditorCommand, EditorCommandEmpty,
  EditorCommandItem, EditorCommandList, EditorBubble, EditorBubbleItem,
  type JSONContent, StarterKit, HighlightExtension, Placeholder,
  TiptapUnderline, TiptapLink, HorizontalRule, TaskItem, TaskList,
  Command, createSuggestionItems, renderItems,
} from "novel"
import { Node, mergeAttributes } from "@tiptap/core"
import ImageExtension from "@tiptap/extension-image"
import YoutubeExtension from "@tiptap/extension-youtube"
import {
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote, Code2, Minus,
  Image, PlayCircle, Video, Music, FileImage, X, Check,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Custom nodes ─────────────────────────────────────────────────────

const VideoNode = Node.create({
  name: "video", group: "block", atom: true,
  addAttributes() { return { src: { default: null }, controls: { default: true } } },
  parseHTML() { return [{ tag: "video[src]" }] },
  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes(HTMLAttributes, { controls: true, class: "w-full rounded-xl max-h-96" })]
  },
})

const AudioNode = Node.create({
  name: "audio", group: "block", atom: true,
  addAttributes() { return { src: { default: null } } },
  parseHTML() { return [{ tag: "audio[src]" }] },
  renderHTML({ HTMLAttributes }) {
    return ["audio", mergeAttributes(HTMLAttributes, { controls: true, class: "w-full my-2" })]
  },
})

// ─── Pending media state ───────────────────────────────────────────────

type MediaType = "image" | "youtube" | "video" | "audio" | "embed"

interface PendingMedia {
  type: MediaType
  label: string
  placeholder: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert: (editor: any, url: string) => void
}

// ─── Inline URL input panel ────────────────────────────────────────────

function MediaUrlPanel({
  pending,
  onSubmit,
  onCancel,
}: {
  pending: PendingMedia
  onSubmit: (url: string) => void
  onCancel: () => void
}) {
  const [url, setUrl] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); if (url.trim()) onSubmit(url.trim()) }
    if (e.key === "Escape") onCancel()
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-ring bg-card px-3 py-2 shadow-md">
      <span className="text-xs font-medium text-muted-foreground shrink-0">{pending.label}:</span>
      <input
        ref={inputRef}
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKey}
        placeholder={pending.placeholder}
        className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 min-w-0"
      />
      <button
        onClick={() => { if (url.trim()) onSubmit(url.trim()) }}
        disabled={!url.trim()}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button onClick={onCancel} className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Editor component ──────────────────────────────────────────────────

interface NovelEditorProps {
  initialContent?: JSONContent | null
  onChange: (content: JSONContent) => void
  className?: string
}

export function NovelEditor({ initialContent, onChange, className }: NovelEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingMedia, setPendingMedia] = useState<(PendingMedia & { editor: any; range: any }) | null>(null)

  const clearPending = useCallback(() => setPendingMedia(null), [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function requestMedia(type: MediaType, label: string, placeholder: string, insert: (editor: any, url: string) => void, editor: any, range: any) {
    // Collapse the range first so cursor is positioned
    editor.chain().focus().deleteRange(range).run()
    setPendingMedia({ type, label, placeholder, insert, editor, range: null })
  }

  const suggestionItems = createSuggestionItems([
    {
      title: "Heading 1", description: "Large section heading", searchTerms: ["h1", "heading"],
      icon: <Heading1 className="h-4 w-4" />,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2", description: "Medium section heading", searchTerms: ["h2", "heading"],
      icon: <Heading2 className="h-4 w-4" />,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3", description: "Small section heading", searchTerms: ["h3", "heading"],
      icon: <Heading3 className="h-4 w-4" />,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
    },
    {
      title: "Bullet list", description: "Unordered list", searchTerms: ["ul", "list"],
      icon: <List className="h-4 w-4" />,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: "Numbered list", description: "Ordered list", searchTerms: ["ol", "ordered"],
      icon: <ListOrdered className="h-4 w-4" />,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: "Task list", description: "Checkboxes", searchTerms: ["todo", "task"],
      icon: <CheckSquare className="h-4 w-4" />,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      title: "Blockquote", description: "Quote block", searchTerms: ["quote"],
      icon: <Quote className="h-4 w-4" />,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: "Code block", description: "Code", searchTerms: ["code", "pre"],
      icon: <Code2 className="h-4 w-4" />,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: "Divider", description: "Horizontal rule", searchTerms: ["hr", "divider"],
      icon: <Minus className="h-4 w-4" />,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      title: "Image / GIF", description: "Insert image or GIF by URL", searchTerms: ["image", "img", "gif", "photo"],
      icon: <Image className="h-4 w-4" />,
      command: ({ editor, range }) =>
        requestMedia("image", "Image URL", "https://example.com/photo.jpg",
          (ed, url) => ed.chain().focus().setImage({ src: url }).run(),
          editor, range),
    },
    {
      title: "YouTube", description: "Embed a YouTube video", searchTerms: ["youtube", "video", "yt"],
      icon: <PlayCircle className="h-4 w-4" />,
      command: ({ editor, range }) =>
        requestMedia("youtube", "YouTube URL", "https://youtube.com/watch?v=...",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ed, url) => ed.chain().focus().setYoutubeVideo({ src: url } as any).run(),
          editor, range),
    },
    {
      title: "Video", description: "Embed an MP4 video by URL", searchTerms: ["video", "mp4"],
      icon: <Video className="h-4 w-4" />,
      command: ({ editor, range }) =>
        requestMedia("video", "Video URL", "https://example.com/video.mp4",
          (ed, url) => ed.chain().focus().insertContent({ type: "video", attrs: { src: url } }).run(),
          editor, range),
    },
    {
      title: "Audio", description: "Embed an audio file by URL", searchTerms: ["audio", "mp3", "podcast"],
      icon: <Music className="h-4 w-4" />,
      command: ({ editor, range }) =>
        requestMedia("audio", "Audio URL", "https://example.com/audio.mp3",
          (ed, url) => ed.chain().focus().insertContent({ type: "audio", attrs: { src: url } }).run(),
          editor, range),
    },
    {
      title: "Embed", description: "Embed any web page as iframe", searchTerms: ["iframe", "embed"],
      icon: <FileImage className="h-4 w-4" />,
      command: ({ editor, range }) =>
        requestMedia("embed", "Embed URL", "https://codepen.io/...",
          (ed, url) => ed.chain().focus()
            .insertContent(`<iframe src="${url}" style="width:100%;height:400px;border:1px solid hsl(var(--border));border-radius:12px;" allowfullscreen></iframe>`)
            .run(),
          editor, range),
    },
  ])

  const slashCommand = Command.configure({
    suggestion: { items: () => suggestionItems, render: renderItems },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extensions: any[] = [
    StarterKit.configure({ horizontalRule: false }),
    HorizontalRule,
    TiptapUnderline,
    TiptapLink.configure({ openOnClick: false }),
    HighlightExtension,
    Placeholder.configure({ placeholder: "Type '/' for commands…" }),
    TaskList,
    TaskItem.configure({ nested: true }),
    ImageExtension.configure({ inline: false, allowBase64: false }),
    YoutubeExtension.configure({ width: 672, height: 378, nocookie: true }),
    VideoNode,
    AudioNode,
    slashCommand,
  ]

  return (
    <div className="space-y-2">
      {/* Inline media URL input — shows when a media slash command is triggered */}
      {pendingMedia && (
        <MediaUrlPanel
          pending={pendingMedia}
          onSubmit={(url) => {
            pendingMedia.insert(pendingMedia.editor, url)
            clearPending()
          }}
          onCancel={clearPending}
        />
      )}

      <EditorRoot>
        <EditorContent
          extensions={extensions}
          initialContent={initialContent ?? undefined}
          onUpdate={({ editor }) => onChange(editor.getJSON())}
          className={cn(
            "relative min-h-[500px] w-full rounded-xl border border-border bg-card focus-within:border-ring/40 transition-colors",
            className
          )}
          editorProps={{
            attributes: {
              class: "prose prose-sm dark:prose-invert max-w-none px-6 py-4 focus:outline-none min-h-[500px]",
            },
          }}
        >
          <EditorCommand className="z-50 h-auto max-h-72 overflow-y-auto rounded-xl border border-border bg-popover px-1 py-2 shadow-lg">
            <EditorCommandEmpty className="px-2 py-1.5 text-sm text-muted-foreground">No results</EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  key={item.title}
                  value={item.title}
                  onCommand={(val) => item.command?.(val as never)}
                  className="flex cursor-pointer select-none items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-accent aria-selected:bg-accent"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium leading-none">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <EditorBubble tippyOptions={{ duration: 100 }} className="flex overflow-hidden rounded-lg border border-border bg-popover shadow-md">
            {[
              { label: "B", title: "Bold", cmd: "toggleBold" },
              { label: "I", title: "Italic", cmd: "toggleItalic" },
              { label: "U", title: "Underline", cmd: "toggleUnderline" },
              { label: "S", title: "Strikethrough", cmd: "toggleStrike" },
              { label: "</>", title: "Code", cmd: "toggleCode" },
            ].map(({ label, title, cmd }) => (
              <EditorBubbleItem
                key={label}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onSelect={(editor: any) => editor.chain().focus()[cmd]().run()}
                className="cursor-pointer px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                <span title={title}>{label}</span>
              </EditorBubbleItem>
            ))}
          </EditorBubble>
        </EditorContent>
      </EditorRoot>
    </div>
  )
}

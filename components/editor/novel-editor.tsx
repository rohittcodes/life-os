"use client"

import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorBubble,
  EditorBubbleItem,
  type JSONContent,
  StarterKit,
  HighlightExtension,
  Placeholder,
  TiptapUnderline,
  TiptapLink,
  HorizontalRule,
  TaskItem,
  TaskList,
  Command,
  createSuggestionItems,
  renderItems,
} from "novel"
import {
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  Quote, Code2, Minus,
} from "lucide-react"
import { cn } from "@/lib/utils"

const suggestionItems = createSuggestionItems([
  {
    title: "Heading 1",
    description: "Large section heading",
    searchTerms: ["h1", "heading", "title"],
    icon: <Heading1 className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    searchTerms: ["h2", "heading"],
    icon: <Heading2 className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    searchTerms: ["h3", "heading"],
    icon: <Heading3 className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet list",
    description: "Unordered list",
    searchTerms: ["ul", "list", "bullet"],
    icon: <List className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    description: "Ordered list",
    searchTerms: ["ol", "ordered"],
    icon: <ListOrdered className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Task list",
    description: "Checkboxes",
    searchTerms: ["todo", "task", "check"],
    icon: <CheckSquare className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Blockquote",
    description: "Quote or callout block",
    searchTerms: ["quote", "blockquote"],
    icon: <Quote className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    description: "Syntax-highlighted code",
    searchTerms: ["code", "pre"],
    icon: <Code2 className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Horizontal rule",
    searchTerms: ["hr", "divider", "line"],
    icon: <Minus className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
])

const slashCommand = Command.configure({
  suggestion: { items: () => suggestionItems, render: renderItems },
})

const extensions = [
  StarterKit.configure({ horizontalRule: false }),
  HorizontalRule,
  TiptapUnderline,
  TiptapLink.configure({ openOnClick: false }),
  HighlightExtension,
  Placeholder.configure({ placeholder: "Type '/' for commands…" }),
  TaskList,
  TaskItem.configure({ nested: true }),
  slashCommand,
]

interface NovelEditorProps {
  initialContent?: JSONContent | null
  onChange: (content: JSONContent) => void
  className?: string
}

export function NovelEditor({ initialContent, onChange, className }: NovelEditorProps) {
  return (
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
            class:
              "prose prose-sm dark:prose-invert max-w-none px-6 py-4 focus:outline-none min-h-[500px]",
          },
        }}
      >
        <EditorCommand className="z-50 h-auto max-h-72 overflow-y-auto rounded-xl border border-border bg-popover px-1 py-2 shadow-lg">
          <EditorCommandEmpty className="px-2 py-1.5 text-sm text-muted-foreground">
            No results
          </EditorCommandEmpty>
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

        <EditorBubble
          tippyOptions={{ duration: 100 }}
          className="flex overflow-hidden rounded-lg border border-border bg-popover shadow-md"
        >
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
  )
}

import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { normalizeRichTextHtml } from '../utils/richText';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
}

const toolbarButtonClass =
  'px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600';

const activeToolbarButtonClass =
  'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-700';

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClassName = 'min-h-[140px]',
}: RichTextEditorProps) {
  const normalizedValue = normalizeRichTextHtml(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: normalizedValue,
    editorProps: {
      attributes: {
        class: `rich-editor-content w-full px-4 py-3 dark:bg-gray-700 dark:text-white focus:outline-none ${minHeightClassName}`,
        'data-placeholder': placeholder || '',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    // Solo re-sincronizamos desde el prop cuando el usuario no está escribiendo;
    // el saneo puede reescribir el markup (p. ej. rel/target en enlaces) y no
    // debe hacer saltar el cursor.
    const currentHtml = editor.getHTML();
    if (normalizedValue !== currentHtml) {
      editor.commands.setContent(normalizedValue, { emitUpdate: false });
    }
  }, [editor, normalizedValue]);

  if (!editor) {
    return null;
  }

  const insertLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('URL del enlace:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const headingValue = editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
      ? 'h3'
      : editor.isActive('blockquote')
        ? 'blockquote'
        : 'paragraph';

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <select
          className="px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
          value={headingValue}
          onChange={e => {
            const nextValue = e.target.value;
            if (nextValue === 'h2') {
              editor.chain().focus().toggleHeading({ level: 2 }).run();
              return;
            }
            if (nextValue === 'h3') {
              editor.chain().focus().toggleHeading({ level: 3 }).run();
              return;
            }
            if (nextValue === 'blockquote') {
              editor.chain().focus().toggleBlockquote().run();
              return;
            }
            editor.chain().focus().setParagraph().run();
          }}
        >
          <option value="paragraph">Párrafo</option>
          <option value="h2">Título H2</option>
          <option value="h3">Título H3</option>
          <option value="blockquote">Cita</option>
        </select>

        <button
          type="button"
          className={`${toolbarButtonClass} ${editor.isActive('bold') ? activeToolbarButtonClass : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={`${toolbarButtonClass} ${editor.isActive('italic') ? activeToolbarButtonClass : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={`${toolbarButtonClass} ${editor.isActive('underline') ? activeToolbarButtonClass : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </button>
        <button
          type="button"
          className={`${toolbarButtonClass} ${editor.isActive('strike') ? activeToolbarButtonClass : ''}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </button>

        <button
          type="button"
          className={`${toolbarButtonClass} ${editor.isActive('bulletList') ? activeToolbarButtonClass : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • Lista
        </button>
        <button
          type="button"
          className={`${toolbarButtonClass} ${editor.isActive('orderedList') ? activeToolbarButtonClass : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. Lista
        </button>

        <button
          type="button"
          className={`${toolbarButtonClass} ${editor.isActive({ textAlign: 'left' }) ? activeToolbarButtonClass : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          Izq
        </button>
        <button
          type="button"
          className={`${toolbarButtonClass} ${editor.isActive({ textAlign: 'center' }) ? activeToolbarButtonClass : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          Centro
        </button>
        <button
          type="button"
          className={`${toolbarButtonClass} ${editor.isActive({ textAlign: 'right' }) ? activeToolbarButtonClass : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          Der
        </button>

        <button
          type="button"
          className={`${toolbarButtonClass} ${editor.isActive('link') ? activeToolbarButtonClass : ''}`}
          onClick={insertLink}
        >
          Link
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
        >
          Limpiar
        </button>
      </div>

      <EditorContent editor={editor} />

      <style>{`
        .ProseMirror:focus {
          outline: none;
        }

        .ProseMirror[contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

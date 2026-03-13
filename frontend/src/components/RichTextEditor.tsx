import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
}

const toolbarButtonClass =
  'px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600';

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClassName = 'min-h-[140px]',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (command: string, commandValue?: string) => {
    document.execCommand(command, false, commandValue);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      editorRef.current.focus();
    }
  };

  const setBlock = (tag: string) => exec('formatBlock', tag);

  const insertLink = () => {
    const url = window.prompt('URL del enlace:');
    if (!url) return;
    exec('createLink', url);
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <select
          className="px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
          onChange={e => setBlock(e.target.value)}
          defaultValue="P"
        >
          <option value="P">Párrafo</option>
          <option value="H2">Título H2</option>
          <option value="H3">Título H3</option>
          <option value="BLOCKQUOTE">Cita</option>
        </select>

        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exec('bold')}
        >
          B
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exec('italic')}
        >
          I
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exec('underline')}
        >
          U
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exec('strikeThrough')}
        >
          S
        </button>

        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exec('insertUnorderedList')}
        >
          • Lista
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exec('insertOrderedList')}
        >
          1. Lista
        </button>

        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exec('justifyLeft')}
        >
          Izq
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exec('justifyCenter')}
        >
          Centro
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exec('justifyRight')}
        >
          Der
        </button>

        <button
          type="button"
          className={toolbarButtonClass}
          onClick={insertLink}
        >
          Link
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => exec('removeFormat')}
        >
          Limpiar
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={`w-full px-4 py-3 dark:bg-gray-700 dark:text-white focus:outline-none ${minHeightClassName}`}
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        data-placeholder={placeholder || ''}
      />

      <style>{`
        [contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

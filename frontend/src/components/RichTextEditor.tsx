'use client';

import { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  className
}: RichTextEditorProps) {
  const { t } = useTranslation();
  const defaultPlaceholder = placeholder || t('richText.placeholder');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const ToolbarButton = ({ icon: Icon, command, value, title }: { icon: any; command: string; value?: string; title: string }) => (
    <button
      type="button"
      onClick={() => execCommand(command, value)}
      className="p-2 hover:bg-gray-100 rounded transition-colors"
      title={title}
      disabled={disabled}
    >
      <Icon size={16} className="text-gray-600" />
    </button>
  );

  return (
    <div className={cn("border border-gray-300 rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center space-x-1 p-2 border-b border-gray-200 bg-gray-50">
        <ToolbarButton icon={Bold} command="bold" title={t('richText.bold')} />
        <ToolbarButton icon={Italic} command="italic" title={t('richText.italic')} />
        <ToolbarButton icon={Underline} command="underline" title={t('richText.underline')} />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton icon={List} command="insertUnorderedList" title={t('richText.bulletList')} />
        <ToolbarButton icon={ListOrdered} command="insertOrderedList" title={t('richText.numberedList')} />
        <ToolbarButton icon={LinkIcon} command="createLink" value="https://" title={t('richText.insertLink')} />
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        className={cn(
          "min-h-[300px] p-4 focus:outline-none",
          disabled && "bg-gray-50 cursor-not-allowed",
          "rich-text-editor"
        )}
        style={{
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}
        data-placeholder={defaultPlaceholder}
        suppressContentEditableWarning
      />
      
      <style>{`
        .rich-text-editor[data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}


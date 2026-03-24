'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered } from 'lucide-react'
import { clsx } from 'clsx'

interface RichTextEditorProps {
    value?: string
    onChange: (html: string) => void
    placeholder?: string
    minRows?: number
    className?: string
    onKeyDown?: (e: React.KeyboardEvent) => void
}

interface ToolbarButton {
    command: string
    icon: React.ReactNode
    label: string
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Escribe aquí...',
    minRows = 3,
    className,
    onKeyDown
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
    const isInternalUpdate = useRef(false)

    // Sync external value changes (e.g. clearing after send)
    useEffect(() => {
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false
            return
        }
        if (editorRef.current && value !== undefined) {
            const currentHTML = editorRef.current.innerHTML
            // Only update if value actually changed externally (avoid cursor jump)
            if (value === '' && currentHTML !== '') {
                editorRef.current.innerHTML = ''
            } else if (value && currentHTML !== value) {
                editorRef.current.innerHTML = value
            }
        }
    }, [value])

    const updateActiveFormats = useCallback(() => {
        const formats = new Set<string>()
        if (document.queryCommandState('bold')) formats.add('bold')
        if (document.queryCommandState('italic')) formats.add('italic')
        if (document.queryCommandState('underline')) formats.add('underline')
        if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough')
        if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList')
        if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList')
        setActiveFormats(formats)
    }, [])

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            isInternalUpdate.current = true
            const html = editorRef.current.innerHTML
            // If the editor only has empty tags or <br>, treat as empty
            const isEmpty = html === '<br>' || html === '<div><br></div>' || html.trim() === ''
            onChange(isEmpty ? '' : html)
        }
    }, [onChange])

    const execCommand = useCallback((command: string) => {
        // Ensure focus is on the editor
        editorRef.current?.focus()
        document.execCommand(command, false)
        handleInput()
        updateActiveFormats()
    }, [handleInput, updateActiveFormats])

    const toolbarButtons: ToolbarButton[] = [
        { command: 'bold', icon: <Bold size={14} />, label: 'Negrita' },
        { command: 'italic', icon: <Italic size={14} />, label: 'Cursiva' },
        { command: 'underline', icon: <Underline size={14} />, label: 'Subrayado' },
        { command: 'strikeThrough', icon: <Strikethrough size={14} />, label: 'Tachado' },
        { command: 'insertUnorderedList', icon: <List size={14} />, label: 'Lista' },
        { command: 'insertOrderedList', icon: <ListOrdered size={14} />, label: 'Lista numerada' },
    ]

    const minHeight = minRows * 24 // ~24px per line

    return (
        <div className={clsx("border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white focus-within:border-indigo-500 transition-all", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-gray-100 bg-white/80">
                {toolbarButtons.map((btn, idx) => (
                    <button
                        key={btn.command}
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            execCommand(btn.command)
                        }}
                        onMouseDown={(e) => e.preventDefault()} // Prevent losing editor focus
                        title={btn.label}
                        className={clsx(
                            "p-1.5 rounded-lg transition-all",
                            activeFormats.has(btn.command)
                                ? "bg-indigo-100 text-indigo-600"
                                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        )}
                    >
                        {btn.icon}
                    </button>
                ))}
            </div>

            {/* Editor */}
            <div className="relative">
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="w-full px-4 py-3 outline-none text-sm leading-relaxed font-medium prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
                    style={{ minHeight: `${minHeight}px` }}
                    onInput={handleInput}
                    onSelect={updateActiveFormats}
                    onKeyUp={updateActiveFormats}
                    onKeyDown={(e) => {
                        if (onKeyDown) onKeyDown(e)
                    }}
                    data-placeholder={placeholder}
                />
                {/* Placeholder */}
                {(!value || value === '') && (
                    <div
                        className="absolute top-3 left-4 text-sm text-gray-400 pointer-events-none font-medium"
                    >
                        {placeholder}
                    </div>
                )}
            </div>
        </div>
    )
}

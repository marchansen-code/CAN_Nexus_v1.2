import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Youtube from '@tiptap/extension-youtube';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Mention from '@tiptap/extension-mention';
import tippy from 'tippy.js';
import axios from 'axios';
import { API } from '@/App';
import { MentionList } from './MentionSuggestion';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Undo,
  Redo,
  FileText,
  Plus,
  Trash2,
  Minus,
  Youtube as YoutubeIcon,
  Palette,
  Type,
  MinusSquare,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Upload,
  ColumnsIcon,
  RowsIcon,
  Indent,
  Outdent,
  Grid3X3,
  PaintBucket,
  Maximize2,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  MoveHorizontal,
  MoveVertical,
  SeparatorHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const COLORS = [
  { name: 'Schwarz', value: '#000000' },
  { name: 'Grau', value: '#6b7280' },
  { name: 'Rot', value: '#dc2626' },
  { name: 'CANUSA Rot', value: '#c8102e' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Gelb', value: '#ca8a04' },
  { name: 'Grün', value: '#16a34a' },
  { name: 'Blau', value: '#2563eb' },
  { name: 'Lila', value: '#9333ea' },
  { name: 'Pink', value: '#db2777' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Gelb', value: '#fef08a' },
  { name: 'Grün', value: '#bbf7d0' },
  { name: 'Blau', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' },
];

const FONT_SIZES = [
  { name: 'Klein', value: '0.875em' },
  { name: 'Normal', value: '1em' },
  { name: 'Mittel', value: '1.125em' },
  { name: 'Groß', value: '1.25em' },
  { name: 'Sehr groß', value: '1.5em' },
  { name: 'Riesig', value: '2em' },
];

const MenuButton = ({ onClick, isActive, disabled, children, title }) => (
  <Toggle
    size="sm"
    pressed={isActive}
    onPressedChange={onClick}
    disabled={disabled}
    className="h-8 w-8 p-0"
    title={title}
  >
    {children}
  </Toggle>
);

const ColorPicker = ({ colors, onSelect, currentColor, icon: Icon, title }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={title}>
        <Icon className="h-4 w-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-2">
      <div className="grid grid-cols-5 gap-1">
        {colors.map((color) => (
          <button
            key={color.value}
            onClick={() => onSelect(color.value)}
            className={cn(
              "w-6 h-6 rounded border-2 transition-all",
              currentColor === color.value ? "border-slate-900 scale-110" : "border-transparent hover:scale-105"
            )}
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>
    </PopoverContent>
  </Popover>
);

const EditorToolbar = ({ editor, onImageUpload }) => {
  const [linkUrl, setLinkUrl] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [youtubeUrl, setYoutubeUrl] = React.useState('');
  const [tableRows, setTableRows] = React.useState(3);
  const [tableCols, setTableCols] = React.useState(3);
  const [tableWithHeader, setTableWithHeader] = React.useState(true);
  const [showTableDialog, setShowTableDialog] = React.useState(false);
  const fileInputRef = useRef(null);

  const setLink = useCallback(() => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
    }
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
    }
  }, [editor, imageUrl]);

  const addYoutube = useCallback(() => {
    if (youtubeUrl) {
      editor.chain().focus().setYoutubeVideo({ src: youtubeUrl }).run();
      setYoutubeUrl('');
    }
  }, [editor, youtubeUrl]);

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ 
      rows: tableRows, 
      cols: tableCols, 
      withHeaderRow: tableWithHeader 
    }).run();
    setShowTableDialog(false);
    // Reset to defaults
    setTableRows(3);
    setTableCols(3);
    setTableWithHeader(true);
  }, [editor]);

  // Set table width by manipulating DOM directly
  const setTableWidth = useCallback((width) => {
    const editorElement = editor.view.dom;
    const table = editorElement.querySelector('table');
    if (table) {
      table.style.width = width;
      table.style.margin = width === '100%' ? '0' : '0 auto';
      // Force editor update
      editor.commands.focus();
    }
  }, [editor]);

  // Set all row heights in the table via CSS custom property
  const setRowHeight = useCallback((height) => {
    setTimeout(() => {
      const editorElement = editor.view.dom;
      const table = editorElement.querySelector('table');
      if (!table) return;
      
      const heightValue = height === 'auto' ? 'auto' : height;
      
      // Set a CSS custom property on the table
      table.style.setProperty('--cell-height', heightValue);
      
      // Apply directly to all cells
      const allCells = table.querySelectorAll('td, th');
      allCells.forEach(cell => {
        if (height === 'auto') {
          cell.style.height = '';
          cell.style.minHeight = '';
        } else {
          cell.style.height = heightValue;
          cell.style.minHeight = heightValue;
        }
      });
      
      editor.commands.focus();
    }, 50);
  }, [editor]);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file && onImageUpload) {
      try {
        const url = await onImageUpload(file);
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }
    event.target.value = '';
  };

  if (!editor) return null;

  return (
    <div className="border-b p-2 flex flex-wrap items-center gap-0.5 bg-muted/30 sticky top-0 z-10">
      {/* Undo/Redo */}
      <MenuButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Rückgängig (Strg+Z)"
      >
        <Undo className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Wiederholen (Strg+Y)"
      >
        <Redo className="h-4 w-4" />
      </MenuButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings & Paragraph */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
            <Type className="h-4 w-4" />
            <span className="text-xs hidden sm:inline">Format</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
            <FileText className="h-4 w-4 mr-2" /> Absatz
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="h-4 w-4 mr-2" /> Überschrift 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-4 w-4 mr-2" /> Überschrift 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-4 w-4 mr-2" /> Überschrift 3
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
            <Heading4 className="h-4 w-4 mr-2" /> Überschrift 4
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Formatting */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Fett (Strg+B)"
      >
        <Bold className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Kursiv (Strg+I)"
      >
        <Italic className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Unterstrichen (Strg+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Durchgestrichen"
      >
        <Strikethrough className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        isActive={editor.isActive('subscript')}
        title="Tiefgestellt"
      >
        <SubscriptIcon className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        isActive={editor.isActive('superscript')}
        title="Hochgestellt"
      >
        <SuperscriptIcon className="h-4 w-4" />
      </MenuButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Color */}
      <ColorPicker
        colors={COLORS}
        onSelect={(color) => editor.chain().focus().setColor(color).run()}
        currentColor={editor.getAttributes('textStyle').color}
        icon={Palette}
        title="Textfarbe"
      />

      {/* Highlight */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("h-8 w-8 p-0", editor.isActive('highlight') && "bg-muted")}
            title="Hervorheben"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="flex gap-1">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
                className="w-6 h-6 rounded border hover:scale-105 transition-transform"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
            <button
              onClick={() => editor.chain().focus().unsetHighlight().run()}
              className="w-6 h-6 rounded border flex items-center justify-center hover:bg-muted"
              title="Entfernen"
            >
              <Minus className="h-3 w-3" />
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <MenuButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Code"
      >
        <Code className="h-4 w-4" />
      </MenuButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Links ausrichten"
      >
        <AlignLeft className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Zentrieren"
      >
        <AlignCenter className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Rechts ausrichten"
      >
        <AlignRight className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        isActive={editor.isActive({ textAlign: 'justify' })}
        title="Blocksatz"
      >
        <AlignJustify className="h-4 w-4" />
      </MenuButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Aufzählung"
      >
        <List className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Nummerierte Liste"
      >
        <ListOrdered className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Zitat"
      >
        <Quote className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontale Linie"
      >
        <MinusSquare className="h-4 w-4" />
      </MenuButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Link */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive('link') && "bg-muted")} title="Link einfügen">
            <LinkIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setLink()}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={setLink}>Einfügen</Button>
              {editor.isActive('link') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => editor.chain().focus().unsetLink().run()}
                >
                  Entfernen
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Image */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Bild einfügen">
            <ImageIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72">
          <div className="p-2 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Bild URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button size="sm" onClick={addImage} className="h-8">OK</Button>
              </div>
            </div>
            <DropdownMenuSeparator />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bild hochladen
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* YouTube */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="YouTube-Video einfügen">
            <YoutubeIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>YouTube URL</Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addYoutube()}
              />
            </div>
            <Button size="sm" onClick={addYoutube}>Video einfügen</Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Table */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive('table') && "bg-muted")} title="Tabelle">
            <TableIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem onClick={() => setShowTableDialog(true)}>
            <Grid3X3 className="h-4 w-4 mr-2" /> Neue Tabelle einfügen...
          </DropdownMenuItem>
          {editor.isActive('table') && (
            <>
              <DropdownMenuSeparator />
              
              {/* Spalten */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ColumnsIcon className="h-4 w-4 mr-2" /> Spalten
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>
                    <Plus className="h-4 w-4 mr-2" /> Spalte links einfügen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                    <Plus className="h-4 w-4 mr-2" /> Spalte rechts einfügen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" /> Spalte löschen
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              {/* Zeilen */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <RowsIcon className="h-4 w-4 mr-2" /> Zeilen
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
                    <Plus className="h-4 w-4 mr-2" /> Zeile oberhalb einfügen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                    <Plus className="h-4 w-4 mr-2" /> Zeile unterhalb einfügen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" /> Zeile löschen
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              {/* Zellen */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Maximize2 className="h-4 w-4 mr-2" /> Zellen
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => editor.chain().focus().mergeCells().run()}>
                    Zellen verbinden
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().splitCell().run()}>
                    Zelle teilen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeaderCell().run()}>
                    Als Kopfzelle umschalten
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              {/* Zellen-Hintergrund */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <PaintBucket className="h-4 w-4 mr-2" /> Zellenhintergrund
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#fef3c7').run()}>
                    <div className="w-4 h-4 mr-2 rounded bg-amber-100 border" /> Gelb
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#dcfce7').run()}>
                    <div className="w-4 h-4 mr-2 rounded bg-green-100 border" /> Grün
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#dbeafe').run()}>
                    <div className="w-4 h-4 mr-2 rounded bg-blue-100 border" /> Blau
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#fce7f3').run()}>
                    <div className="w-4 h-4 mr-2 rounded bg-pink-100 border" /> Rosa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#f3f4f6').run()}>
                    <div className="w-4 h-4 mr-2 rounded bg-gray-100 border" /> Grau
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', null).run()}>
                    <Minus className="h-4 w-4 mr-2" /> Entfernen
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Tabellenbreite */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <MoveHorizontal className="h-4 w-4 mr-2" /> Tabellenbreite
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTableWidth('100%')}>
                    <div className="w-full h-2 mr-2 bg-slate-300 rounded" /> 100% (Volle Breite)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTableWidth('75%')}>
                    <div className="w-3/4 h-2 mr-2 bg-slate-300 rounded" /> 75%
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTableWidth('50%')}>
                    <div className="w-1/2 h-2 mr-2 bg-slate-300 rounded" /> 50%
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTableWidth('33%')}>
                    <div className="w-1/3 h-2 mr-2 bg-slate-300 rounded" /> 33%
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTableWidth('auto')}>
                    <div className="w-1/4 h-2 mr-2 bg-slate-300 rounded" /> Auto (Inhalt)
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Zeilenhöhe */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <MoveVertical className="h-4 w-4 mr-2" /> Zellenhöhe
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setRowHeight('auto')}>
                    <SeparatorHorizontal className="h-4 w-4 mr-2" /> Auto (Standard)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRowHeight('40px')}>
                    <SeparatorHorizontal className="h-4 w-4 mr-2" /> Kompakt (40px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRowHeight('60px')}>
                    <SeparatorHorizontal className="h-4 w-4 mr-2" /> Normal (60px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRowHeight('80px')}>
                    <SeparatorHorizontal className="h-4 w-4 mr-2" /> Groß (80px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRowHeight('120px')}>
                    <SeparatorHorizontal className="h-4 w-4 mr-2" /> Sehr groß (120px)
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
                Kopfzeile umschalten
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeaderColumn().run()}>
                Kopfspalte umschalten
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" /> Tabelle löschen
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Table Creation Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              Neue Tabelle einfügen
            </DialogTitle>
            <DialogDescription>
              Wählen Sie die Größe der Tabelle
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="table-rows">Zeilen</Label>
                <Input
                  id="table-rows"
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-cols">Spalten</Label>
                <Input
                  id="table-cols"
                  type="number"
                  min="1"
                  max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="table-header"
                checked={tableWithHeader}
                onCheckedChange={setTableWithHeader}
              />
              <Label htmlFor="table-header" className="cursor-pointer">
                Mit Kopfzeile
              </Label>
            </div>
            
            {/* Preview Grid */}
            <div className="border rounded-lg p-3 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Vorschau:</p>
              <div 
                className="grid gap-0.5"
                style={{ 
                  gridTemplateColumns: `repeat(${Math.min(tableCols, 6)}, 1fr)`,
                  maxWidth: '200px'
                }}
              >
                {Array.from({ length: Math.min(tableRows, 6) * Math.min(tableCols, 6) }).map((_, i) => {
                  const row = Math.floor(i / Math.min(tableCols, 6));
                  const isHeader = tableWithHeader && row === 0;
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "h-4 rounded-sm border",
                        isHeader ? "bg-slate-200" : "bg-white"
                      )}
                    />
                  );
                })}
              </div>
              {(tableRows > 6 || tableCols > 6) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Zeigt max. 6x6 Vorschau ({tableRows}x{tableCols} wird erstellt)
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={addTable} className="bg-canusa-red hover:bg-red-600">
              Tabelle einfügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const RichTextEditor = ({ content, onChange, placeholder = "Inhalt eingeben...", className, onImageUpload }) => {
  // Mention suggestion configuration
  const mentionSuggestion = {
    char: '@',
    allowSpaces: true,
    items: async ({ query }) => {
      if (!query || query.length < 2) return [];
      try {
        const response = await axios.get(`${API}/articles/search/linkable`, {
          params: { q: query, limit: 8 }
        });
        return response.data.results || [];
      } catch (error) {
        console.error('Failed to fetch articles for mention:', error);
        return [];
      }
    },
    render: () => {
      let component;
      let popup;

      return {
        onStart: props => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },

        onUpdate(props) {
          component?.updateProps(props);

          if (!props.clientRect) return;

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide();
            return true;
          }

          return component?.ref?.onKeyDown(props);
        },

        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        horizontalRule: false,
      }),
      HorizontalRule,
      Underline,
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-red-600 underline cursor-pointer hover:text-red-700',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
        allowBase64: true,
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: 'rounded-lg my-4 mx-auto',
        },
      }),
      Table.configure({
        resizable: true,
        lastColumnResizable: true,
        cellMinWidth: 50,
        HTMLAttributes: {
          class: 'border-collapse w-full my-4',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-slate-300 p-3 align-top relative',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-slate-300 p-3 bg-slate-100 font-semibold relative',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention-link',
        },
        suggestion: mentionSuggestion,
        renderHTML({ options, node }) {
          return [
            'a',
            {
              ...options.HTMLAttributes,
              href: `/articles/${node.attrs.id}`,
              'data-mention': '',
              'data-article-id': node.attrs.id,
            },
            `@${node.attrs.label}`,
          ];
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[400px] px-6 py-4 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:border-l-4 prose-blockquote:border-red-500 prose-blockquote:pl-4 prose-blockquote:italic prose-img:rounded-lg prose-table:border-collapse prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline',
      },
      handlePaste: (view, event) => {
        const html = event.clipboardData?.getData('text/html');
        if (html) {
          return false;
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length && onImageUpload) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            onImageUpload(file).then(url => {
              if (url) {
                const { schema } = view.state;
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                const node = schema.nodes.image.create({ src: url });
                const transaction = view.state.tr.insert(coordinates?.pos || 0, node);
                view.dispatch(transaction);
              }
            });
            return true;
          }
        }
        return false;
      },
    },
  });

  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-white shadow-sm", className)}>
      <EditorToolbar editor={editor} onImageUpload={onImageUpload} />
      <div className="overflow-auto max-h-[600px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichTextEditor;

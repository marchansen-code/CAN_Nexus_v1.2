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
import { UserMentionList } from './UserMentionList';
import MultiImageUploadDialog from './dialogs/MultiImageUploadDialog';
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
  SeparatorHorizontal,
  ImagePlus,
  ZoomIn,
  ZoomOut,
  Minimize2,
  Code2,
  Images,
  ExternalLink,
  FolderOpen,
  Search,
  Eye,
  X
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import DocumentViewer from '@/components/DocumentViewer';

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

// Extended Image extension with resizing support
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width') || element.style.width || null,
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width, style: `width: ${attributes.width}` };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height') || element.style.height || null,
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
    };
  },
});

const EditorToolbar = ({ editor, onImageUpload, isFullscreen, onToggleFullscreen, onMultiImageUpload, showHtmlEditor, onToggleHtmlEditor }) => {
  const [linkUrl, setLinkUrl] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [youtubeUrl, setYoutubeUrl] = React.useState('');
  const [tableRows, setTableRows] = React.useState(3);
  const [tableCols, setTableCols] = React.useState(3);
  const [tableWithHeader, setTableWithHeader] = React.useState(true);
  const [showTableDialog, setShowTableDialog] = React.useState(false);
  const fileInputRef = useRef(null);
  
  // Extended Link Dialog State
  const [showLinkDialog, setShowLinkDialog] = React.useState(false);
  const [linkTab, setLinkTab] = React.useState('url'); // 'url' or 'document'
  const [linkText, setLinkText] = React.useState('');
  const [hasSelectedText, setHasSelectedText] = React.useState(false);
  const [documents, setDocuments] = React.useState([]);
  const [documentSearch, setDocumentSearch] = React.useState('');
  const [selectedDocument, setSelectedDocument] = React.useState(null);
  const [documentLinkType, setDocumentLinkType] = React.useState('text'); // 'thumbnail', 'text', 'short'
  const [loadingDocuments, setLoadingDocuments] = React.useState(false);
  
  // YouTube Dialog State
  const [showYoutubeDialog, setShowYoutubeDialog] = React.useState(false);
  const [pendingYoutubeUrl, setPendingYoutubeUrl] = React.useState('');
  const [youtubeDisplayType, setYoutubeDisplayType] = React.useState('preview'); // 'preview' or 'link'

  // Load documents for link dialog
  const loadDocuments = async (search = '') => {
    setLoadingDocuments(true);
    try {
      const response = await axios.get(`${API}/documents`, {
        params: { search: search || undefined }
      });
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Open link dialog with context
  const openLinkDialog = () => {
    const { selection } = editor.state;
    const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
    setHasSelectedText(!!selectedText && selectedText.trim().length > 0);
    setLinkText(selectedText || '');
    setLinkUrl('');
    setSelectedDocument(null);
    setDocumentLinkType(selectedText ? 'text' : 'short');
    setLinkTab('url');
    loadDocuments();
    setShowLinkDialog(true);
  };

  // Insert link (URL or Document)
  const insertLink = () => {
    if (linkTab === 'url' && linkUrl) {
      if (hasSelectedText) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      } else if (linkText) {
        editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run();
      } else {
        // Short URL display
        const shortUrl = linkUrl.replace(/^https?:\/\/(www\.)?/, '').substring(0, 30) + (linkUrl.length > 30 ? '...' : '');
        editor.chain().focus().insertContent(`<a href="${linkUrl}">${shortUrl}</a>`).run();
      }
    } else if (linkTab === 'document' && selectedDocument) {
      const docUrl = selectedDocument.image_id 
        ? `${API}/images/${selectedDocument.image_id}`
        : `${API}/documents/${selectedDocument.document_id}/file`;
      const docViewUrl = `#doc-preview-${selectedDocument.document_id}`;
      
      if (hasSelectedText) {
        // Just link the selected text
        editor.chain().focus().extendMarkRange('link').setLink({ 
          href: docViewUrl,
          'data-document-id': selectedDocument.document_id
        }).run();
      } else if (documentLinkType === 'thumbnail' && selectedDocument.is_image) {
        // Insert thumbnail image that links to document
        editor.chain().focus().insertContent(
          `<a href="${docViewUrl}" data-document-id="${selectedDocument.document_id}"><img src="${docUrl}" alt="${selectedDocument.filename}" style="max-width: 200px; border-radius: 8px;" /></a>`
        ).run();
      } else if (documentLinkType === 'text' && linkText) {
        editor.chain().focus().insertContent(
          `<a href="${docViewUrl}" data-document-id="${selectedDocument.document_id}">${linkText}</a>`
        ).run();
      } else {
        // Short display
        const shortName = selectedDocument.filename.length > 25 
          ? selectedDocument.filename.substring(0, 25) + '...' 
          : selectedDocument.filename;
        editor.chain().focus().insertContent(
          `<a href="${docViewUrl}" data-document-id="${selectedDocument.document_id}">📄 ${shortName}</a>`
        ).run();
      }
    }
    setShowLinkDialog(false);
  };

  // Handle YouTube URL - check if it's a valid YouTube link
  const handleYoutubeInput = (url) => {
    setYoutubeUrl(url);
  };

  const checkAndInsertYoutube = () => {
    if (!youtubeUrl) return;
    // Show dialog to ask preview or link
    setPendingYoutubeUrl(youtubeUrl);
    setYoutubeDisplayType('preview');
    setShowYoutubeDialog(true);
    setYoutubeUrl('');
  };

  const insertYoutube = () => {
    if (!pendingYoutubeUrl) return;
    
    if (youtubeDisplayType === 'preview') {
      // Insert embedded video
      editor.chain().focus().setYoutubeVideo({ src: pendingYoutubeUrl }).run();
    } else {
      // Insert as link only
      const videoId = extractYoutubeId(pendingYoutubeUrl);
      const displayUrl = `youtube.com/watch?v=${videoId}`;
      editor.chain().focus().insertContent(
        `<a href="${pendingYoutubeUrl}" target="_blank" rel="noopener">🎬 ${displayUrl}</a>`
      ).run();
    }
    setShowYoutubeDialog(false);
    setPendingYoutubeUrl('');
  };

  const extractYoutubeId = (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return match ? match[1] : '';
  };

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

  // Set image size using TipTap's updateAttributes
  const setImageSize = useCallback((width) => {
    // First try to use updateAttributes if image is selected
    const { state } = editor;
    const { selection } = state;
    
    // Check if we have an image node selected
    if (selection.node?.type?.name === 'image') {
      editor.chain().focus().updateAttributes('image', { 
        width: width,
        height: 'auto'
      }).run();
      return;
    }
    
    // Fallback: find any image in the editor and update it
    const editorElement = editor.view.dom;
    const images = editorElement.querySelectorAll('img');
    if (images.length > 0) {
      // Update the last image or the selected one
      const selectedImg = editorElement.querySelector('img.ProseMirror-selectednode') || images[images.length - 1];
      if (selectedImg) {
        selectedImg.style.width = width;
        selectedImg.style.height = 'auto';
        selectedImg.setAttribute('width', width);
      }
    }
    
    // Also try via TipTap command
    editor.chain().focus().updateAttributes('image', { 
      width: width,
      height: 'auto'
    }).run();
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
      <Button 
        variant="ghost" 
        size="sm" 
        className={cn("h-8 w-8 p-0", editor.isActive('link') && "bg-muted")} 
        title="Link einfügen"
        onClick={openLinkDialog}
      >
        <LinkIcon className="h-4 w-4" />
      </Button>

      {/* Extended Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Link einfügen
            </DialogTitle>
            <DialogDescription>
              {hasSelectedText 
                ? `Ausgewählter Text: "${linkText.substring(0, 30)}${linkText.length > 30 ? '...' : ''}"`
                : 'Kein Text ausgewählt - Link wird eingefügt'
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs value={linkTab} onValueChange={setLinkTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">
                <ExternalLink className="w-4 h-4 mr-2" />
                URL
              </TabsTrigger>
              <TabsTrigger value="document">
                <FileText className="w-4 h-4 mr-2" />
                Dokument
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
              {!hasSelectedText && (
                <div className="space-y-2">
                  <Label>Anzeigetext (optional)</Label>
                  <Input
                    placeholder="Text für den Link..."
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leer lassen für gekürzten Link
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="document" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Dokument suchen</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Suchen..."
                    value={documentSearch}
                    onChange={(e) => {
                      setDocumentSearch(e.target.value);
                      loadDocuments(e.target.value);
                    }}
                    className="pl-9"
                  />
                </div>
              </div>

              <ScrollArea className="h-[200px] border rounded-md p-2">
                {loadingDocuments ? (
                  <div className="text-center py-4 text-muted-foreground">Laden...</div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">Keine Dokumente gefunden</div>
                ) : (
                  <div className="space-y-1">
                    {documents.slice(0, 20).map(doc => (
                      <button
                        key={doc.document_id}
                        onClick={() => setSelectedDocument(doc)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded text-left text-sm hover:bg-muted transition-colors",
                          selectedDocument?.document_id === doc.document_id && "bg-indigo-50 border border-indigo-200"
                        )}
                      >
                        {doc.is_image ? (
                          <div className="w-8 h-8 rounded overflow-hidden bg-muted shrink-0">
                            <img 
                              src={`${API}/images/${doc.image_id}`} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{doc.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {selectedDocument && !hasSelectedText && (
                <div className="space-y-3 border-t pt-3">
                  <Label>Darstellung</Label>
                  <RadioGroup value={documentLinkType} onValueChange={setDocumentLinkType}>
                    {selectedDocument.is_image && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="thumbnail" id="thumbnail" />
                        <Label htmlFor="thumbnail" className="cursor-pointer">
                          Vorschaubild (Thumbnail)
                        </Label>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="text" id="text" />
                      <Label htmlFor="text" className="cursor-pointer">
                        Eigener Link-Text
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="short" id="short" />
                      <Label htmlFor="short" className="cursor-pointer">
                        Gekürzter Dateiname
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  {documentLinkType === 'text' && (
                    <Input
                      placeholder="Link-Text eingeben..."
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                    />
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={insertLink}
              disabled={
                (linkTab === 'url' && !linkUrl) || 
                (linkTab === 'document' && !selectedDocument)
              }
            >
              Link einfügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            {editor.isActive('image') && (
              <>
                <DropdownMenuSeparator />
                <div className="space-y-2">
                  <Label className="text-xs">Bildgröße anpassen</Label>
                  <div className="grid grid-cols-3 gap-1">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setImageSize('25%')}>
                      25%
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setImageSize('50%')}>
                      50%
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setImageSize('75%')}>
                      75%
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setImageSize('100%')}>
                      100%
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setImageSize('auto')}>
                      Auto
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setImageSize('300px')}>
                      300px
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Multi-Image Upload */}
      {onMultiImageUpload && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Mehrere Bilder hochladen"
          onClick={onMultiImageUpload}
        >
          <Images className="h-4 w-4" />
        </Button>
      )}

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
                onChange={(e) => handleYoutubeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkAndInsertYoutube()}
              />
            </div>
            <Button size="sm" onClick={checkAndInsertYoutube}>Video einfügen</Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* YouTube Display Type Dialog */}
      <Dialog open={showYoutubeDialog} onOpenChange={setShowYoutubeDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <YoutubeIcon className="w-5 h-5 text-red-600" />
              YouTube-Video einfügen
            </DialogTitle>
            <DialogDescription>
              Wie soll das Video angezeigt werden?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <RadioGroup value={youtubeDisplayType} onValueChange={setYoutubeDisplayType}>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setYoutubeDisplayType('preview')}>
                <RadioGroupItem value="preview" id="yt-preview" className="mt-0.5" />
                <div>
                  <Label htmlFor="yt-preview" className="cursor-pointer font-medium">
                    Video-Vorschau einbetten
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Das Video wird direkt im Artikel angezeigt und kann abgespielt werden
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setYoutubeDisplayType('link')}>
                <RadioGroupItem value="link" id="yt-link" className="mt-0.5" />
                <div>
                  <Label htmlFor="yt-link" className="cursor-pointer font-medium">
                    Nur als Link anzeigen
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Ein klickbarer Link öffnet das Video auf YouTube
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowYoutubeDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={insertYoutube} className="bg-red-600 hover:bg-red-700">
              Einfügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Fullscreen Toggle */}
      {onToggleFullscreen && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="h-8 gap-1 px-2"
            title={isFullscreen ? "Vollbildmodus beenden (Esc)" : "Vollbildmodus"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
            <span className="text-xs hidden sm:inline">{isFullscreen ? "Beenden" : "Vollbild"}</span>
          </Button>
        </>
      )}

      {/* HTML Editor Toggle */}
      {onToggleHtmlEditor && (
        <Button
          variant={showHtmlEditor ? "secondary" : "ghost"}
          size="sm"
          onClick={onToggleHtmlEditor}
          className="h-8 gap-1 px-2"
          title="HTML-Editor"
        >
          <Code2 className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">HTML</span>
        </Button>
      )}

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

const RichTextEditor = ({ content, onChange, placeholder = "Inhalt eingeben...", className, onImageUpload, isFullscreen = false, onToggleFullscreen }) => {
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [showMultiImageDialog, setShowMultiImageDialog] = useState(false);
  const [documentPreview, setDocumentPreview] = useState(null); // For document preview popup
  
  // Handle clicks on document links in the editor
  const handleEditorClick = useCallback((event) => {
    const link = event.target.closest('a[data-document-id]');
    if (link) {
      event.preventDefault();
      const documentId = link.getAttribute('data-document-id');
      if (documentId) {
        // Fetch document details and show preview
        axios.get(`${API}/documents/${documentId}`)
          .then(res => {
            setDocumentPreview(res.data);
          })
          .catch(err => {
            console.error('Failed to load document:', err);
          });
      }
    }
  }, []);
  
  // Mention suggestion configuration for articles (@)
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

  // User mention suggestion configuration (@@)
  const userMentionSuggestion = {
    char: '@@',
    allowSpaces: true,
    items: async ({ query }) => {
      try {
        const response = await axios.get(`${API}/users/search/mention`, {
          params: { q: query || '', limit: 8 }
        });
        return response.data.results || [];
      } catch (error) {
        console.error('Failed to fetch users for mention:', error);
        return [];
      }
    },
    render: () => {
      let component;
      let popup;

      return {
        onStart: props => {
          component = new ReactRenderer(UserMentionList, {
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
      ResizableImage.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4 cursor-pointer',
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
      // User mention extension
      Mention.extend({ name: 'userMention' }).configure({
        HTMLAttributes: {
          class: 'user-mention',
        },
        suggestion: userMentionSuggestion,
        renderHTML({ options, node }) {
          return [
            'span',
            {
              ...options.HTMLAttributes,
              'data-user-mention': '',
              'data-user-id': node.attrs.id,
            },
            `@@${node.attrs.label}`,
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
        // Handle pasted images - upload and save to Bilder folder
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file && onImageUpload) {
                // Upload image and save to Bilder folder
                const formData = new FormData();
                formData.append('files', file);
                
                axios.post(`${API}/images/upload-multiple?save_to_documents=true`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                }).then(response => {
                  if (response.data?.uploaded?.length > 0) {
                    const imgUrl = response.data.uploaded[0].url;
                    const { schema } = view.state;
                    const node = schema.nodes.image.create({ src: imgUrl });
                    const transaction = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(transaction);
                  }
                }).catch(err => {
                  console.error('Failed to upload pasted image:', err);
                  // Fallback to base64 if upload fails
                  const reader = new FileReader();
                  reader.onload = () => {
                    const { schema } = view.state;
                    const node = schema.nodes.image.create({ src: reader.result });
                    const transaction = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(transaction);
                  };
                  reader.readAsDataURL(file);
                });
                return true;
              }
            }
          }
        }
        
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

  // Sync HTML editor content
  React.useEffect(() => {
    if (showHtmlEditor && editor) {
      setHtmlContent(editor.getHTML());
    }
  }, [showHtmlEditor, editor]);

  const handleHtmlChange = (e) => {
    setHtmlContent(e.target.value);
  };

  const applyHtmlChanges = () => {
    if (editor) {
      editor.commands.setContent(htmlContent);
      onChange(htmlContent);
      setShowHtmlEditor(false);
    }
  };

  const handleMultiImageUpload = (uploadedImages) => {
    if (editor && uploadedImages?.length > 0) {
      // Insert each image with a line break between them
      let chain = editor.chain().focus();
      uploadedImages.forEach((img, index) => {
        chain = chain.setImage({ src: img.url });
        // Add a paragraph after each image (except the last one) to allow text between images
        if (index < uploadedImages.length - 1) {
          chain = chain.createParagraphNear();
        }
      });
      chain.run();
    }
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col", className)}>
      <EditorToolbar 
        editor={editor} 
        onImageUpload={onImageUpload} 
        isFullscreen={isFullscreen} 
        onToggleFullscreen={onToggleFullscreen}
        onMultiImageUpload={() => setShowMultiImageDialog(true)}
        showHtmlEditor={showHtmlEditor}
        onToggleHtmlEditor={() => setShowHtmlEditor(!showHtmlEditor)}
      />
      
      {showHtmlEditor ? (
        <div className="flex-1 flex flex-col p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">HTML-Quellcode</Label>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowHtmlEditor(false)}>
                Abbrechen
              </Button>
              <Button size="sm" onClick={applyHtmlChanges} className="bg-red-500 hover:bg-red-600">
                Änderungen übernehmen
              </Button>
            </div>
          </div>
          <Textarea
            value={htmlContent}
            onChange={handleHtmlChange}
            className={cn(
              "flex-1 font-mono text-sm resize-none",
              isFullscreen ? "min-h-0" : "min-h-[500px]"
            )}
            placeholder="HTML-Code hier eingeben..."
          />
        </div>
      ) : (
        <div 
          className={cn("overflow-auto flex-1", isFullscreen ? "min-h-0" : "max-h-[600px]")}
          onClick={handleEditorClick}
        >
          <EditorContent editor={editor} />
        </div>
      )}

      {/* Multi-Image Upload Dialog */}
      <MultiImageUploadDialog
        open={showMultiImageDialog}
        onClose={() => setShowMultiImageDialog(false)}
        onImagesUploaded={handleMultiImageUpload}
      />

      {/* Document Preview Dialog */}
      <Dialog open={!!documentPreview} onOpenChange={(open) => !open && setDocumentPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {documentPreview?.filename || documentPreview?.title || 'Dokumentenvorschau'}
            </DialogTitle>
            <DialogDescription>
              {documentPreview?.file_size && (
                <span>{(documentPreview.file_size / 1024).toFixed(1)} KB</span>
              )}
              {documentPreview?.created_at && (
                <span className="ml-4">Hochgeladen: {new Date(documentPreview.created_at).toLocaleDateString('de-DE')}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-auto">
            {documentPreview && (
              documentPreview.is_image && documentPreview.image_id ? (
                // Image preview
                <div className="flex items-center justify-center p-4">
                  <img 
                    src={`${API}/images/${documentPreview.image_id}`} 
                    alt={documentPreview.filename}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                </div>
              ) : documentPreview.file_type === '.pdf' ? (
                // PDF preview via iframe with inline endpoint
                <div className="h-[60vh]">
                  <iframe
                    src={`${API}/documents/${documentPreview.document_id}/preview`}
                    className="w-full h-full border-0 rounded-lg"
                    title={documentPreview.filename}
                  />
                </div>
              ) : documentPreview.html_content ? (
                // DOCX, XLSX, CSV etc. - show HTML content
                <div className="p-4 prose prose-slate dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: documentPreview.html_content }} />
                </div>
              ) : documentPreview.extracted_text ? (
                // Fallback: show extracted text
                <div className="p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-[60vh]">
                    {documentPreview.extracted_text}
                  </pre>
                </div>
              ) : (
                // No preview available
                <div className="flex flex-col items-center justify-center h-[40vh] text-muted-foreground">
                  <FileText className="w-16 h-16 mb-4 opacity-30" />
                  <p>Keine Vorschau verfügbar</p>
                  <p className="text-sm">Klicken Sie unten, um die Datei zu öffnen</p>
                </div>
              )
            )}
          </div>
          
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                const url = documentPreview.image_id 
                  ? `${API}/images/${documentPreview.image_id}`
                  : `${API}/documents/${documentPreview.document_id}/file`;
                window.open(url, '_blank');
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              In neuem Tab öffnen
            </Button>
            <Button onClick={() => setDocumentPreview(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RichTextEditor;

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RichTextEditor from './RichTextEditor';
import { cn } from '@/lib/utils';

const FullscreenEditor = ({ 
  isOpen, 
  onClose, 
  content, 
  onChange, 
  onImageUpload,
  title = "Editor" 
}) => {
  // Handle Escape key to close
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
      data-testid="fullscreen-editor"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-lg">{title}</h2>
          <span className="text-sm text-muted-foreground">Vollbild-Editor</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Schließen (Esc)</span>
        </Button>
      </div>

      {/* Editor */}
      <div className="p-4 h-[calc(100vh-60px)]">
        <RichTextEditor
          content={content}
          onChange={onChange}
          onImageUpload={onImageUpload}
          isFullscreen={true}
          onToggleFullscreen={onClose}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default FullscreenEditor;

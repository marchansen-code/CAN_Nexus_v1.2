import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MentionList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.article_id, label: item.title });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm text-muted-foreground">
        Keine Artikel gefunden
      </div>
    );
  }

  return (
    <div className="bg-popover border rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
      {props.items.map((item, index) => (
        <button
          key={item.article_id}
          onClick={() => selectItem(index)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
            index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
          )}
        >
          <FileText className="w-4 h-4 text-red-500 shrink-0" />
          <span className="truncate">{item.title}</span>
          {item.status === 'draft' && (
            <span className="text-xs text-muted-foreground ml-auto">(Entwurf)</span>
          )}
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';

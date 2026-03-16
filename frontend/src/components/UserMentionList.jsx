import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const getRoleBadge = (role) => {
  switch (role) {
    case 'admin':
      return <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Admin</span>;
    case 'editor':
      return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Editor</span>;
    default:
      return null;
  }
};

export const UserMentionList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.user_id, label: item.name });
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
        Keine Benutzer gefunden
      </div>
    );
  }

  return (
    <div className="bg-popover border rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto min-w-[200px]">
      {props.items.map((item, index) => (
        <button
          key={item.user_id}
          onClick={() => selectItem(index)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
            index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
          )}
        >
          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{item.name}</span>
              {getRoleBadge(item.role)}
            </div>
            <span className="text-xs text-muted-foreground truncate block">{item.email}</span>
          </div>
        </button>
      ))}
    </div>
  );
});

UserMentionList.displayName = 'UserMentionList';

import { Search, X } from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';

export type CommandAction = {
  id: string;
  label: string;
  description: string;
  keyHint?: string;
  disabled?: boolean;
  disabledReason?: string;
  onActivate: () => void;
};

type CommandPaletteProps = {
  actions: CommandAction[];
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({ actions, open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!open) {
      setQuery('');
      setFocusedIndex(0);
      return;
    }
  }, [open]);

  const filteredActions = useMemo(() => {
    const nextActions = actions.filter((action) => {
      const search = `${action.label} ${action.description}`.toLowerCase();
      return !normalizedQuery || search.includes(normalizedQuery);
    });
    return nextActions;
  }, [actions, normalizedQuery]);

  useEffect(() => {
    if (focusedIndex >= filteredActions.length) setFocusedIndex(0);
  }, [filteredActions, focusedIndex]);

  const activeAction = filteredActions[focusedIndex];
  const onSubmit = () => {
    if (!activeAction || activeAction.disabled) return;
    activeAction.onActivate();
    onClose();
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusedIndex((current) => (current + 1) % Math.max(filteredActions.length, 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusedIndex((current) => {
        const next = current - 1;
        return next < 0 ? filteredActions.length - 1 : next;
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  };

  if (!open) return null;

  return (
    <div className="command-scrim" role="presentation" onMouseDown={onClose} aria-hidden="true">
      <section
        className="command-panel"
        data-testid="mission-control"
        role="dialog"
        aria-label="Mission control"
        aria-modal="true"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onPanelKeyDown}
      >
        <header className="command-heading">
          <Search size={14} />
          <h2>Mission control</h2>
          <button className="tiny-icon-button" type="button" aria-label="Close mission control" onClick={onClose}>
            <X size={14} />
          </button>
        </header>

        <form className="command-search" onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}>
          <label className="command-search-label" htmlFor="command-search-input">
            Search
          </label>
          <input
            autoFocus
            id="command-search-input"
            name="command-search"
            placeholder="Type to filter commands"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setFocusedIndex(0);
            }}
          />
        </form>

        <ul className="command-list" role="listbox" aria-label="Available commands">
          {filteredActions.length ? (
            filteredActions.map((action, index) => (
              <li
                className={index === focusedIndex ? 'command-item command-item-active' : 'command-item'}
                key={action.id}
                role="option"
                aria-selected={index === focusedIndex}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <button
                  type="button"
                  className="command-item-action"
                  disabled={action.disabled}
                  aria-label={`Run ${action.label}`}
                  title={action.disabledReason}
                  onClick={() => {
                    if (!action.disabled) {
                      action.onActivate();
                      onClose();
                    }
                  }}
                >
                  <span>
                    <strong>{action.label}</strong>
                    <em>{action.description}</em>
                  </span>
                  {action.keyHint ? <kbd>{action.keyHint}</kbd> : null}
                </button>
              </li>
            ))
          ) : (
            <li className="command-item empty" role="option">
              <span>No matching mission commands</span>
            </li>
          )}
        </ul>

        <div className="command-footer">Use the keyboard, then Enter to run, Esc to close.</div>
      </section>
    </div>
  );
}

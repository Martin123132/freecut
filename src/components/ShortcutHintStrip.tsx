type ShortcutHintStripProps = {
  items: {
    keyHint: string;
    label: string;
    enabled: boolean;
    disabledReason?: string;
  }[];
};

export function ShortcutHintStrip({ items }: ShortcutHintStripProps) {
  return (
    <section className="shortcut-strip" aria-label="Keyboard shortcuts">
      <span className="shortcut-strip-kicker">Quick controls</span>
      <ul className="shortcut-strip-list">
        {items.map((item) => (
          <li className="shortcut-strip-item" key={item.keyHint}>
            <kbd>{item.keyHint}</kbd>
            <span title={item.disabledReason} className={item.enabled ? 'enabled' : 'disabled'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

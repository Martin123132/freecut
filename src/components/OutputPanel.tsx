import { SlidersHorizontal } from 'lucide-react';
import { ExportProfile, defaultExportProfile, exportProfiles } from '../lib/exportProfiles';

type OutputPanelProps = {
  profile: ExportProfile;
  onProfileChange: (profile: ExportProfile) => void;
};

export function OutputPanel({ profile = defaultExportProfile, onProfileChange }: OutputPanelProps) {
  return (
    <section className="control-group output-group">
      <div className="control-title">
        <SlidersHorizontal size={16} />
        <span>Output</span>
      </div>
      <div className="output-profile-grid" role="radiogroup" aria-label="Export quality">
        {exportProfiles.map((item) => (
          <button
            className={item.id === profile.id ? 'output-profile active' : 'output-profile'}
            type="button"
            role="radio"
            aria-checked={item.id === profile.id}
            key={item.id}
            onClick={() => onProfileChange(item)}
          >
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </button>
        ))}
      </div>
      <div className="output-summary">
        <span>{profile.intent}</span>
      </div>
    </section>
  );
}

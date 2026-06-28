import { AlignCenter, Crosshair, Crop, Type } from 'lucide-react';
import { CaptionCue } from '../lib/captions';
import { CaptionStyle } from '../lib/captionStyles';
import { ExportReadinessSummary } from '../lib/exportEstimate';
import { ExportProfile } from '../lib/exportProfiles';
import { AspectPreset, aspectPresets } from '../lib/presets';
import { CaptionsPanel } from './CaptionsPanel';
import { ExportPreflight, PreflightItem } from './ExportPreflight';
import { ExportReadinessPanel } from './ExportReadinessPanel';
import { OutputPanel } from './OutputPanel';
import { RuntimeHealth, RuntimeStatusPanel } from './RuntimeStatusPanel';

type InspectorProps = {
  preset: AspectPreset;
  exportProfile: ExportProfile;
  captionStyle: CaptionStyle;
  exportReadiness: ExportReadinessSummary;
  preflightItems: PreflightItem[];
  preflightPrimaryLabel: string;
  preflightPrimaryDisabled: boolean;
  captions: CaptionCue[];
  currentTime: number;
  duration: number;
  isExporting: boolean;
  runtimeHealth: RuntimeHealth | null;
  overlayText: string;
  overlayX: number;
  overlayY: number;
  overlaySize: number;
  cropX: number;
  cropY: number;
  onCaptionsChange: (captions: CaptionCue[]) => void;
  onCaptionStyleChange: (style: CaptionStyle) => void;
  onExportProfileChange: (profile: ExportProfile) => void;
  onPresetChange: (preset: AspectPreset) => void;
  onOverlayTextChange: (value: string) => void;
  onOverlayXChange: (value: number) => void;
  onOverlayYChange: (value: number) => void;
  onOverlaySizeChange: (value: number) => void;
  onCropXChange: (value: number) => void;
  onCropYChange: (value: number) => void;
  onCropCenter: () => void;
  onPreflightPrimaryAction: () => void;
  onSeek: (time: number) => void;
};

export function Inspector({
  preset,
  exportProfile,
  captionStyle,
  exportReadiness,
  preflightItems,
  preflightPrimaryLabel,
  preflightPrimaryDisabled,
  captions,
  currentTime,
  duration,
  isExporting,
  runtimeHealth,
  overlayText,
  overlayX,
  overlayY,
  overlaySize,
  cropX,
  cropY,
  onCaptionsChange,
  onCaptionStyleChange,
  onExportProfileChange,
  onPresetChange,
  onOverlayTextChange,
  onOverlayXChange,
  onOverlayYChange,
  onOverlaySizeChange,
  onCropXChange,
  onCropYChange,
  onCropCenter,
  onPreflightPrimaryAction,
  onSeek
}: InspectorProps) {
  return (
    <aside className="panel inspector-panel">
      <div className="panel-heading">
        <span>Inspector</span>
      </div>

      <ExportPreflight
        items={preflightItems}
        isExporting={isExporting}
        primaryLabel={preflightPrimaryLabel}
        primaryDisabled={preflightPrimaryDisabled}
        onPrimaryAction={onPreflightPrimaryAction}
      />

      <RuntimeStatusPanel health={runtimeHealth} />

      <OutputPanel profile={exportProfile} onProfileChange={onExportProfileChange} />

      <ExportReadinessPanel summary={exportReadiness} />

      <section className="control-group">
        <div className="control-title">
          <Crop size={16} />
          <span>Format</span>
        </div>
        <div className="preset-grid">
          {aspectPresets.map((item) => (
            <button
              className={item.id === preset.id ? 'preset active' : 'preset'}
              type="button"
              key={item.id}
              onClick={() => onPresetChange(item)}
            >
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="control-group">
        <div className="control-title control-title-split">
          <span>
            <Crosshair size={16} />
            <span>Reframe</span>
          </span>
          <button className="mini-action" type="button" onClick={onCropCenter}>
            Center
          </button>
        </div>
        <label className="field">
          <span>Focus X</span>
          <input
            type="range"
            min={0}
            max={100}
            value={cropX}
            onChange={(event) => onCropXChange(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Focus Y</span>
          <input
            type="range"
            min={0}
            max={100}
            value={cropY}
            onChange={(event) => onCropYChange(Number(event.target.value))}
          />
        </label>
      </section>

      <section className="control-group">
        <div className="control-title">
          <Type size={16} />
          <span>Text</span>
        </div>
        <textarea
          className="text-input"
          rows={3}
          value={overlayText}
          onChange={(event) => onOverlayTextChange(event.target.value)}
          placeholder="Caption"
        />
        <label className="field">
          <span>Size</span>
          <input
            type="range"
            min={2}
            max={8}
            step={0.25}
            value={overlaySize}
            onChange={(event) => onOverlaySizeChange(Number(event.target.value))}
          />
        </label>
      </section>

      <section className="control-group">
        <div className="control-title">
          <AlignCenter size={16} />
          <span>Position</span>
        </div>
        <label className="field">
          <span>X</span>
          <input
            type="range"
            min={0}
            max={100}
            value={overlayX}
            onChange={(event) => onOverlayXChange(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Y</span>
          <input
            type="range"
            min={0}
            max={100}
            value={overlayY}
            onChange={(event) => onOverlayYChange(Number(event.target.value))}
          />
        </label>
      </section>

      <CaptionsPanel
        captions={captions}
        captionStyle={captionStyle}
        currentTime={currentTime}
        duration={duration}
        onCaptionStyleChange={onCaptionStyleChange}
        onCaptionsChange={onCaptionsChange}
        onSeek={onSeek}
      />
    </aside>
  );
}

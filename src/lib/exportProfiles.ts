export type ExportProfileId = 'quick' | 'balanced' | 'master';

export type ExportProfile = {
  id: ExportProfileId;
  label: string;
  detail: string;
  intent: string;
};

export const exportProfiles: ExportProfile[] = [
  {
    id: 'quick',
    label: 'Quick',
    detail: 'Fast render',
    intent: 'Small file'
  },
  {
    id: 'balanced',
    label: 'Balanced',
    detail: 'Clean default',
    intent: 'Best fit'
  },
  {
    id: 'master',
    label: 'Master',
    detail: 'Higher fidelity',
    intent: 'Archive'
  }
];

export const defaultExportProfile = exportProfiles[1];

export function exportProfileFromId(id: string | undefined | null) {
  return exportProfiles.find((profile) => profile.id === id) ?? defaultExportProfile;
}

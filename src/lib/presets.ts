export type AspectPreset = {
  id: string;
  label: string;
  detail: string;
  ratio: string;
  width: number;
  height: number;
};

export const aspectPresets: AspectPreset[] = [
  {
    id: 'wide',
    label: '16:9',
    detail: '1920 x 1080',
    ratio: '16 / 9',
    width: 1920,
    height: 1080
  },
  {
    id: 'vertical',
    label: '9:16',
    detail: '1080 x 1920',
    ratio: '9 / 16',
    width: 1080,
    height: 1920
  },
  {
    id: 'square',
    label: '1:1',
    detail: '1080 x 1080',
    ratio: '1 / 1',
    width: 1080,
    height: 1080
  },
  {
    id: 'portrait',
    label: '4:5',
    detail: '1080 x 1350',
    ratio: '4 / 5',
    width: 1080,
    height: 1350
  }
];

export type CaptionStyleId = 'clean' | 'bold-box' | 'shorts-pop';

export type CaptionStyle = {
  id: CaptionStyleId;
  label: string;
  detail: string;
  className: string;
};

export const captionStyles: CaptionStyle[] = [
  {
    id: 'clean',
    label: 'Clean',
    detail: 'Soft black box',
    className: 'caption-style-clean'
  },
  {
    id: 'bold-box',
    label: 'Bold Box',
    detail: 'White block',
    className: 'caption-style-bold-box'
  },
  {
    id: 'shorts-pop',
    label: 'Shorts Pop',
    detail: 'Loud yellow text',
    className: 'caption-style-shorts-pop'
  }
];

export const defaultCaptionStyle = captionStyles[0];

export function captionStyleFromId(id: string | undefined | null) {
  return captionStyles.find((style) => style.id === id) ?? defaultCaptionStyle;
}

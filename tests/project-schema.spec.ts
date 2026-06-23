import { expect, test } from '@playwright/test';
import { createProjectSnapshot, parseProjectText, serializeProject } from '../src/lib/project';

test('older project files without reframe or caption style fields migrate safely', () => {
  const snapshot = parseProjectText(
    JSON.stringify({
      version: 1,
      savedAt: '2026-06-22T00:00:00.000Z',
      mediaName: 'source.mp4',
      presetId: 'vertical',
      exportProfileId: 'master',
      trimStart: 1.2,
      trimEnd: 5.4,
      overlayText: 'OLD CUT',
      overlayX: 44,
      overlayY: 70,
      overlaySize: 5,
      captions: [
        {
          id: 'legacy-cue',
          start: 1.5,
          end: 3,
          text: 'Legacy caption'
        }
      ]
    })
  );

  expect(snapshot.cropX).toBe(50);
  expect(snapshot.cropY).toBe(50);
  expect(snapshot.captionStyleId).toBe('clean');
  expect(snapshot.exportProfileId).toBe('master');
  expect(snapshot.presetId).toBe('vertical');
  expect(snapshot.captions).toHaveLength(1);
  expect(snapshot.captions[0].text).toBe('Legacy caption');
});

test('new project files preserve export, reframe, captions, and caption style settings', () => {
  const snapshot = createProjectSnapshot({
    mediaName: 'launch-cut.webm',
    presetId: 'portrait',
    exportProfileId: 'balanced',
    captionStyleId: 'shorts-pop',
    trimStart: 0.4,
    trimEnd: 6.8,
    overlayText: 'MAKE IT FREE',
    overlayX: 42,
    overlayY: 68,
    overlaySize: 5.5,
    cropX: 78,
    cropY: 34,
    captions: [
      {
        id: 'cue-1',
        start: 0.6,
        end: 2.8,
        text: 'No subscription gate'
      },
      {
        id: 'cue-2',
        start: 3.1,
        end: 5.9,
        text: 'Export locally'
      }
    ]
  });
  const parsed = parseProjectText(serializeProject(snapshot));

  expect(parsed.mediaName).toBe('launch-cut.webm');
  expect(parsed.presetId).toBe('portrait');
  expect(parsed.exportProfileId).toBe('balanced');
  expect(parsed.captionStyleId).toBe('shorts-pop');
  expect(parsed.cropX).toBe(78);
  expect(parsed.cropY).toBe(34);
  expect(parsed.overlayText).toBe('MAKE IT FREE');
  expect(parsed.overlayX).toBe(42);
  expect(parsed.overlayY).toBe(68);
  expect(parsed.overlaySize).toBe(5.5);
  expect(parsed.captions.map((caption) => caption.text)).toEqual(['No subscription gate', 'Export locally']);
});

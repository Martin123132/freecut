import { expect, test } from '@playwright/test';
import { sanitizeExportReceipts } from '../src/lib/exportHistory';
import { createProjectSnapshot, parseProjectText, serializeProject } from '../src/lib/project';
import { createRecentProjectEntry, maxRecentProjects, sanitizeRecentProjects } from '../src/lib/recentProjects';

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

test('recent project storage sanitizes, dedupes, and caps browser state', () => {
  const first = createProjectSnapshot({
    mediaName: 'first.webm',
    presetId: 'vertical',
    exportProfileId: 'balanced',
    captionStyleId: 'clean',
    trimStart: 0,
    trimEnd: 5,
    overlayText: 'FIRST',
    overlayX: 50,
    overlayY: 72,
    overlaySize: 4.5,
    cropX: 50,
    cropY: 50,
    captions: []
  });
  const duplicate = createProjectSnapshot({
    ...first,
    trimEnd: 7
  });
  const rest = Array.from({ length: maxRecentProjects + 2 }, (_, index) =>
    createRecentProjectEntry(
      createProjectSnapshot({
        mediaName: `clip-${index}.webm`,
        presetId: index % 2 ? 'square' : 'wide',
        exportProfileId: 'quick',
        captionStyleId: 'bold-box',
        trimStart: 0,
        trimEnd: index + 1,
        overlayText: '',
        overlayX: 50,
        overlayY: 72,
        overlaySize: 4.5,
        cropX: 50,
        cropY: 50,
        captions: []
      })
    )
  );

  const projects = sanitizeRecentProjects({
    version: 1,
    items: [createRecentProjectEntry(first), createRecentProjectEntry(duplicate), { broken: true }, ...rest]
  });

  expect(projects).toHaveLength(maxRecentProjects);
  expect(projects[0].snapshot.mediaName).toBe('first.webm');
  expect(projects.filter((project) => project.snapshot.mediaName === 'first.webm')).toHaveLength(1);
  expect(projects.every((project) => project.snapshot.version === 1)).toBe(true);
});

test('export receipt storage restores metadata without stale download URLs', () => {
  const receipts = sanitizeExportReceipts({
    version: 1,
    items: [
      {
        captionLabel: 'Shorts Pop',
        createdAt: 1782264000000,
        durationLabel: '0:05',
        filename: 'freecut-1782264000000.mp4',
        id: 'job-1',
        presetLabel: '9:16',
        profileLabel: 'Balanced',
        projectKey: 'same-edit',
        projectSnapshot: createProjectSnapshot({
          mediaName: 'receipt-source.webm',
          presetId: 'vertical',
          exportProfileId: 'balanced',
          captionStyleId: 'shorts-pop',
          trimStart: 0.2,
          trimEnd: 1.2,
          overlayText: '',
          overlayX: 50,
          overlayY: 72,
          overlaySize: 4.5,
          cropX: 80,
          cropY: 35,
          captions: [{ id: 'receipt-cue', start: 0.3, end: 0.9, text: 'Receipt route' }]
        }),
        size: 1024,
        sourceName: 'receipt-source.webm',
        url: 'blob:stale'
      },
      {
        id: '',
        filename: 'broken.mp4'
      }
    ]
  });

  expect(receipts).toHaveLength(1);
  expect(receipts[0]).toMatchObject({
    available: false,
    captionLabel: 'Shorts Pop',
    filename: 'freecut-1782264000000.mp4',
    projectKey: 'same-edit',
    sourceName: 'receipt-source.webm',
    size: 1024,
    url: null
  });
  expect(receipts[0].projectSnapshot?.mediaName).toBe('receipt-source.webm');
  expect(receipts[0].projectSnapshot?.cropX).toBe(80);
});

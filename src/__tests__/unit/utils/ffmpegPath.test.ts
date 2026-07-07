import { beforeEach, describe, expect, it } from 'vitest';

import { getFFmpegPath } from '@/utils/ffmpegPath';

describe('getFFmpegPath', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('quotes a configured FFmpeg executable path when it contains spaces', () => {
    localStorage.setItem('appSettings', JSON.stringify({
      ffmpegPath: 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    }));

    expect(getFFmpegPath()).toBe('"C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe"');
  });

  it('uses ffmpeg from PATH when no custom path is configured', () => {
    expect(getFFmpegPath()).toBe('ffmpeg');
  });
});

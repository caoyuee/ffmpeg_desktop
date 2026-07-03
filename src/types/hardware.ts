export type HardwareBackend =
  | 'nvenc'
  | 'qsv'
  | 'amf'
  | 'vaapi'
  | 'videotoolbox'
  | 'vulkan'
  | 'd3d12va';

export interface HardwareCapabilities {
  ffmpegPath: string;
  backends: HardwareBackend[];
  encoders: string[];
  hwaccels: string[];
  filters: string[];
}

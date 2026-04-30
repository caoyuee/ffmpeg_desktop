<template>
  <div class="advanced-settings">
    <div class="form-section">
      <h4>全自定义命令模式</h4>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="useFullCustom" @change="onFullCustomToggle" />
          <span>启用全自定义命令（将忽略所有其他参数设置）</span>
        </label>
      </div>
      <div v-if="useFullCustom" class="form-group">
        <label>自定义命令</label>
        <textarea v-model="localPreset.custom.fullCustom" @input="onChange" rows="4" placeholder="ffmpeg -i &quot;$INPUT&quot; -c:v libx264 -crf 23 -c:a aac &quot;$OUTPUT.mp4&quot;"></textarea>
        <div class="hint">支持占位符: $INPUT (输入文件), $OUTPUT (输出文件)</div>
      </div>
    </div>

    <div class="form-section">
      <h4>解码设置</h4>
      <div class="form-group">
        <label>解码器</label>
        <select v-model="localPreset.decode.decoder" @change="onChange">
          <option value="">自动选择</option>
          <option value="h264">H.264 硬件解码</option>
          <option value="hevc">HEVC 硬件解码</option>
          <option value="av1">AV1 硬件解码</option>
        </select>
      </div>

      <div class="form-group">
        <label>硬件加速参数</label>
        <select v-model="localPreset.decode.hwAccelParam" @change="onChange">
          <option value="">禁用</option>
          <option value="cuda">NVIDIA CUDA</option>
          <option value="qsv">Intel QSV</option>
          <option value="vaapi">VAAPI (Linux)</option>
          <option value="videotoolbox">VideoToolbox (macOS)</option>
          <option value="d3d11va">D3D11VA (Windows)</option>
        </select>
      </div>

      <div class="form-group">
        <label>CPU 线程数</label>
        <input type="text" v-model="localPreset.decode.cpuThreads" @input="onChange" placeholder="留空自动" />
      </div>
    </div>

    <div class="form-section">
      <h4>自定义参数</h4>
      <div class="form-group">
        <label>视频滤镜</label>
        <textarea v-model="localPreset.custom.videoFilter" @input="onChange" rows="2" placeholder="如: eq=brightness=0.1"></textarea>
      </div>

      <div class="form-group">
        <label>音频滤镜</label>
        <textarea v-model="localPreset.custom.audioFilter" @input="onChange" rows="2" placeholder="如: volume=2"></textarea>
      </div>

      <div class="form-group">
        <label>滤镜复杂链</label>
        <textarea v-model="localPreset.custom.filterComplex" @input="onChange" rows="2" placeholder="-filter_complex 参数"></textarea>
      </div>

      <div class="form-group">
        <label>视频参数</label>
        <textarea v-model="localPreset.custom.videoParams" @input="onChange" rows="2" placeholder="额外的视频编码参数"></textarea>
      </div>

      <div class="form-group">
        <label>音频参数</label>
        <textarea v-model="localPreset.custom.audioParams" @input="onChange" rows="2" placeholder="额外的音频编码参数"></textarea>
      </div>

      <div class="form-group">
        <label>起始参数</label>
        <textarea v-model="localPreset.custom.startParams" @input="onChange" rows="2" placeholder="放在命令最前面的参数"></textarea>
      </div>

      <div class="form-group">
        <label>输出前参数</label>
        <textarea v-model="localPreset.custom.beforeOutputParams" @input="onChange" rows="2" placeholder="放在输出文件名之前的参数"></textarea>
      </div>

      <div class="form-group">
        <label>输出后参数</label>
        <textarea v-model="localPreset.custom.afterOutputParams" @input="onChange" rows="2" placeholder="放在输出文件名之后的参数"></textarea>
      </div>

      <div class="form-group">
        <label>结尾参数</label>
        <textarea v-model="localPreset.custom.endParams" @input="onChange" rows="2" placeholder="如: -y"></textarea>
      </div>
    </div>

    <div class="form-section">
      <h4>流控制</h4>
      <div class="form-group">
        <label>元数据处理方式</label>
        <select v-model.number="localPreset.streamControl.metadataOption" @change="onChange">
          <option :value="0">保留元数据</option>
          <option :value="1">删除元数据</option>
        </select>
      </div>

      <div class="form-group">
        <label>章节处理方式</label>
        <select v-model.number="localPreset.streamControl.chapterOption" @change="onChange">
          <option :value="0">保留章节</option>
          <option :value="1">删除章节</option>
        </select>
      </div>

      <div class="form-group">
        <label>附件处理方式</label>
        <select v-model.number="localPreset.streamControl.attachmentOption" @change="onChange">
          <option :value="0">保留附件</option>
          <option :value="1">删除附件</option>
        </select>
      </div>
    </div>

    <div class="form-section">
      <h4>图像编码</h4>
      <div class="form-group">
        <label>图像编码器</label>
        <select v-model="localPreset.image.encoder" @change="onChange">
          <option value="">不处理</option>
          <option value="png">PNG</option>
          <option value="apng">APNG (动态PNG)</option>
          <option value="mjpeg">JPEG</option>
          <option value="libwebp">WebP</option>
          <option value="gif">GIF</option>
          <option value="bmp">BMP</option>
          <option value="tiff">TIFF</option>
        </select>
      </div>
      <div v-if="localPreset.image.encoder && localPreset.image.encoder !== 'bmp'" class="form-group">
        <label>图像质量</label>
        <input type="text" v-model="localPreset.image.quality" @input="onChange" placeholder="如: 90 (1-100)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { PresetData } from '@/types/preset';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });

const useFullCustom = ref(!!localPreset.value.custom.fullCustom);

function onFullCustomToggle() {
  if (!useFullCustom.value) {
    localPreset.value.custom.fullCustom = '';
  }
  onChange();
}

watch(() => props.preset, (newVal) => {
  if (newVal) {
    localPreset.value = { ...newVal };
  }
}, { deep: true });

function onChange() {
  emit('update:preset', localPreset.value);
}
</script>

<style scoped>
.advanced-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section {
  background: var(--bg-color2, #242424);
  border-radius: 8px;
  padding: 16px;
}

.form-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-color1, #c0c0c0);
  border-bottom: 1px solid var(--border-color1, #333);
  padding-bottom: 8px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-color2, #808080);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-color1, #181818);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  box-sizing: border-box;
  font-family: 'Consolas', 'Monaco', monospace;
}

.form-group textarea {
  resize: vertical;
  min-height: 50px;
}

.hint {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-color3, #666);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}
</style>

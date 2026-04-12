<template>
  <div class="advanced-settings">
    <div class="form-section">
      <h4>解码设置</h4>
      <div class="form-group">
        <label>解码器</label>
        <select v-model="localPreset.video.decoder.codec" @change="onChange">
          <option value="">自动选择</option>
          <option value="h264">H.264 硬件解码</option>
          <option value="hevc">HEVC 硬件解码</option>
          <option value="av1">AV1 硬件解码</option>
        </select>
      </div>

      <div class="form-group">
        <label>硬件加速</label>
        <select v-model="localPreset.video.decoder.hwaccel" @change="onChange">
          <option value="">禁用</option>
          <option value="cuda">NVIDIA CUDA</option>
          <option value="qsv">Intel QSV</option>
          <option value="vaapi">VAAPI (Linux)</option>
          <option value="videotoolbox">VideoToolbox (macOS)</option>
          <option value="d3d11va">D3D11VA (Windows)</option>
        </select>
      </div>

      <div class="form-group">
        <label>解码线程数</label>
        <input type="number" v-model.number="localPreset.video.decoder.threads" @input="onChange" min="0" placeholder="0 = 自动" />
      </div>
    </div>

    <div class="form-section">
      <h4>自定义参数</h4>
      <div class="form-group">
        <label>输入参数 (放在 -i 之前)</label>
        <textarea v-model="localPreset.custom.inputParams" @input="onChange" rows="3" placeholder="例如: -threads 4"></textarea>
      </div>

      <div class="form-group">
        <label>输出参数 (放在输出文件之前)</label>
        <textarea v-model="localPreset.custom.outputParams" @input="onChange" rows="3" placeholder="例如: -movflags +faststart"></textarea>
      </div>

      <div class="form-group">
        <label>结尾参数 (放在输出文件之后)</label>
        <textarea v-model="localPreset.custom.endParams" @input="onChange" rows="3" placeholder="例如: -y"></textarea>
      </div>
    </div>

    <div class="form-section">
      <h4>性能选项</h4>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.performance.fastStart" @change="onChange" />
          <span>快速启动 (Web 播放优化)</span>
        </label>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.performance.copyTs" @change="onChange" />
          <span>复制时间戳</span>
        </label>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.performance.overwrite" @change="onChange" />
          <span>覆盖已存在的文件</span>
        </label>
      </div>
    </div>

    <div class="form-section">
      <h4>元数据处理</h4>
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

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
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
  min-height: 60px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color1, #c0c0c0);
}
</style>

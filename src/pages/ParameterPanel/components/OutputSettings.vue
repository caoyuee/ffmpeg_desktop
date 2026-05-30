<template>
  <div class="output-settings">
    <div class="form-section">
      <div class="form-group">
        <label>输出容器</label>
        <select v-model="localPreset.output.container" @change="onChange">
          <option value=".mp4">MP4</option>
          <option value=".mkv">MKV</option>
          <option value=".webm">WebM</option>
          <option value=".avi">AVI</option>
          <option value=".mov">MOV</option>
          <option value=".flv">FLV</option>
          <option value=".ts">TS</option>
          <option value=".m2ts">M2TS</option>
          <option value=".wmv">WMV</option>
          <option value=".3gp">3GP</option>
          <option value=".ogg">OGG</option>
        </select>
        <div v-if="compatibilityWarning" class="compat-warning">
          <span v-for="(w, i) in compatibilityWarning" :key="i">{{ w }}</span>
        </div>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.output.naming.noOutputFileParam" @change="onChange" />
          <span>不使用输出文件参数</span>
        </label>
      </div>

      <div class="form-group">
        <label>输出目录</label>
        <div class="input-row">
          <input type="text" v-model="localPreset.output.location" @input="onChange" placeholder="留空则与源文件相同" />
          <button @click="selectDirectory">选择</button>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>自动命名</h4>
      <div class="form-group">
        <SwitchToggle v-model="localPreset.output.naming.useAutoNaming" @update:model-value="onChange" />
      </div>

      <template v-if="localPreset.output.naming.useAutoNaming">
        <div class="form-group">
          <label>自动命名选项</label>
          <select v-model.number="localPreset.output.naming.autoNamingOption" @change="onChange">
            <option :value="0">仅添加后缀</option>
            <option :value="1">仅添加前缀</option>
            <option :value="2">替换文件名</option>
            <option :value="3">完全自定义</option>
          </select>
        </div>

        <div class="form-group">
          <label>开头文本</label>
          <input type="text" v-model="localPreset.output.naming.prefixText" @input="onChange" />
        </div>

        <div class="form-group">
          <label>替代文本</label>
          <input type="text" v-model="localPreset.output.naming.replaceText" @input="onChange" />
        </div>

        <div class="form-group">
          <label>结尾文本</label>
          <input type="text" v-model="localPreset.output.naming.suffixText" @input="onChange" />
        </div>
      </template>
    </div>

    <div class="form-section">
      <h4>时间戳保留</h4>
      <div class="form-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.output.naming.preserveCreationTime" @change="onChange" />
          <span>保留创建时间</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.output.naming.preserveModifyTime" @change="onChange" />
          <span>保留修改时间</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.output.naming.preserveAccessTime" @change="onChange" />
          <span>保留访问时间</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { PresetData } from '@/types/preset';
import { FORMAT_COMPATIBILITY } from '@/utils/ffmpegCommandBuilder';
import SwitchToggle from '@/components/SwitchToggle/SwitchToggle.vue';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });

watch(() => props.preset, (newVal) => {
  if (newVal) {
    localPreset.value = { ...newVal };
  }
}, { deep: true });

const compatibilityWarning = computed(() => {
  const container = localPreset.value.output.container.replace(/^\./, '');
  const compat = FORMAT_COMPATIBILITY[container];
  if (!compat) return null;

  const videoCodec = localPreset.value.video.encoder.codec;
  const audioCodec = localPreset.value.audio.encoder;

  const warnings: string[] = [];

  if (videoCodec && videoCodec !== 'copy' && videoCodec !== 'disable' && videoCodec !== 'custom') {
    if (compat.videoCodecs.length > 0 && !compat.videoCodecs.includes(videoCodec)) {
      warnings.push(`视频编码器 "${videoCodec}" 与容器 ${container.toUpperCase()} 不兼容`);
    }
  }

  if (audioCodec && audioCodec !== 'copy' && audioCodec !== 'disable') {
    if (compat.audioCodecs.length > 0 && !compat.audioCodecs.includes(audioCodec)) {
      warnings.push(`音频编码器 "${audioCodec}" 与容器 ${container.toUpperCase()} 不兼容`);
    }
  }

  return warnings.length > 0 ? warnings : null;
});

function onChange() {
  emit('update:preset', localPreset.value);
}

async function selectDirectory() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({ directory: true });
  if (selected && typeof selected === 'string') {
    localPreset.value.output.location = selected;
    onChange();
  }
}
</script>

<style scoped>
.output-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-color1, #181818);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  box-sizing: border-box;
}

.input-row {
  display: flex;
  gap: 8px;
}

.input-row input {
  flex: 1;
}

.input-row button {
  padding: 8px 16px;
  background: var(--bg-color3, #404040);
  border: 1px solid var(--border-color1, #555);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  cursor: pointer;
  white-space: nowrap;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color1, #c0c0c0);
}


.compat-warning {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compat-warning span {
  font-size: 12px;
  color: #ffc107;
}
</style>

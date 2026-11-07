<template>
  <div class="output-settings">
    <div class="form-section">
      <div class="form-group">
        <label>{{ t('page.params.outputContainer') }}</label>
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
          <span class="compat-hint">{{ t('page.params.compatibilityHint') }}</span>
          <div v-if="!acknowledged" class="compat-actions">
            <button
              type="button"
              class="app-btn compat-btn"
              data-testid="use-recommended"
              @click="applyRecommendedCodecs"
            >
              {{ t('page.params.useRecommendedCodecs') }}
            </button>
            <button
              type="button"
              class="app-btn compat-btn"
              data-testid="keep-current"
              @click="acknowledge"
            >
              {{ t('page.params.keepCurrentCodecs') }}
            </button>
          </div>
          <span v-else class="compat-acknowledged" data-testid="compat-acknowledged">
            {{ t('page.params.compatibilityAcknowledged') }}
          </span>
        </div>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input
            v-model="localPreset.output.naming.noOutputFileParam"
            type="checkbox"
            @change="onChange"
          />
          <span>{{ t('page.params.noOutputFileParam') }}</span>
        </label>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.outputDirectory') }}</label>
        <div class="input-row">
          <input
            v-model="localPreset.output.location"
            type="text"
            :placeholder="t('page.params.outputDirectoryPlaceholder')"
            @input="onChange"
          />
          <button class="app-btn" @click="selectDirectory">
            {{ t('page.params.selectDirectory') }}
          </button>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>{{ t('page.params.autoNaming') }}</h4>
      <div class="form-group">
        <div>
          <SwitchToggle
            v-model="localPreset.output.naming.useAutoNaming"
            :show-labels="true"
            :off-label="t('common.disabled')"
            :on-label="t('common.enabled')"
            @update:model-value="onChange"
          />
        </div>
      </div>

      <template v-if="localPreset.output.naming.useAutoNaming">
        <div class="form-group">
          <label>{{ t('page.params.autoNamingOption') }}</label>
          <select v-model.number="localPreset.output.naming.autoNamingOption" @change="onChange">
            <option :value="0">{{ t('page.params.suffixOnly') }}</option>
            <option :value="1">{{ t('page.params.prefixOnly') }}</option>
            <option :value="2">{{ t('page.params.replaceFileName') }}</option>
            <option :value="3">{{ t('page.params.fullyCustom') }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>{{ t('page.params.prefixText') }}</label>
          <input v-model="localPreset.output.naming.prefixText" type="text" @input="onChange" />
        </div>

        <div class="form-group">
          <label>{{ t('page.params.replaceText') }}</label>
          <input v-model="localPreset.output.naming.replaceText" type="text" @input="onChange" />
        </div>

        <div class="form-group">
          <label>{{ t('page.params.suffixText') }}</label>
          <input v-model="localPreset.output.naming.suffixText" type="text" @input="onChange" />
        </div>
      </template>
    </div>

    <div class="form-section">
      <h4>{{ t('page.params.preserveTimestamps') }}</h4>
      <div class="form-row">
        <label class="checkbox-label timestamp-checkbox">
          <input
            v-model="localPreset.output.naming.preserveCreationTime"
            type="checkbox"
            @change="onChange"
          />
          <span>{{ t('page.params.preserveCreationTime') }}</span>
        </label>
        <label class="checkbox-label timestamp-checkbox">
          <input
            v-model="localPreset.output.naming.preserveModifyTime"
            type="checkbox"
            @change="onChange"
          />
          <span>{{ t('page.params.preserveModifyTime') }}</span>
        </label>
        <label class="checkbox-label timestamp-checkbox">
          <input
            v-model="localPreset.output.naming.preserveAccessTime"
            type="checkbox"
            @change="onChange"
          />
          <span>{{ t('page.params.preserveAccessTime') }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PresetData } from '@/types/preset'
import { getFormatCompatibility, getRecommendedCodec } from '@/config/codecDatabase'
import SwitchToggle from '@/components/SwitchToggle/SwitchToggle.vue'

const props = defineProps<{
  preset: PresetData
}>()

const emit = defineEmits<{
  'update:preset': [preset: PresetData]
}>()

const { t } = useI18n()
const localPreset = ref<PresetData>({ ...props.preset })
// R2.2：确认只对当前组合有效，任何相关配置变化都要求用户重新确认。
const acknowledged = ref(false)

watch(
  () => props.preset,
  (newVal) => {
    if (newVal) {
      localPreset.value = { ...newVal }
    }
  },
  { deep: true },
)

const compatibilityWarning = computed(() => {
  const container = localPreset.value.output.container.replace(/^\./, '')
  const compat = getFormatCompatibility(container)
  if (!compat) return null

  const videoCodec = localPreset.value.video.encoder.codec
  const audioCodec = localPreset.value.audio.encoder

  const warnings: string[] = []

  if (videoCodec && videoCodec !== 'copy' && videoCodec !== 'disable' && videoCodec !== 'custom') {
    if (compat.videoCodecs.length > 0 && !compat.videoCodecs.includes(videoCodec)) {
      warnings.push(
        t('page.params.videoCodecIncompatible', {
          codec: videoCodec,
          container: container.toUpperCase(),
        }),
      )
    }
  }

  if (audioCodec && audioCodec !== 'copy' && audioCodec !== 'disable') {
    if (compat.audioCodecs.length > 0 && !compat.audioCodecs.includes(audioCodec)) {
      warnings.push(
        t('page.params.audioCodecIncompatible', {
          codec: audioCodec,
          container: container.toUpperCase(),
        }),
      )
    }
  }

  return warnings.length > 0 ? warnings : null
})

function onChange() {
  emit('update:preset', localPreset.value)
}

/** R2.2：兼容性结论只做展示，是否调整编码器完全由用户点击确认。 */
function applyRecommendedCodecs() {
  const container = localPreset.value.output.container.replace(/^\./, '')
  if (!getFormatCompatibility(container)) return

  const recommendedVideo = getRecommendedCodec(container, 'video')
  const recommendedAudio = getRecommendedCodec(container, 'audio')

  // 深拷贝相关层级，避免就地修改 props.preset（会污染 DEFAULT_PRESET）。
  const next: PresetData = {
    ...localPreset.value,
    video: {
      ...localPreset.value.video,
      encoder: {
        ...localPreset.value.video.encoder,
        ...(recommendedVideo ? { codec: recommendedVideo } : {}),
      },
    },
    audio: {
      ...localPreset.value.audio,
      ...(recommendedAudio ? { encoder: recommendedAudio } : {}),
    },
  }

  localPreset.value = next
  acknowledged.value = false
  emit('update:preset', next)
}

function acknowledge() {
  acknowledged.value = true
}

watch(
  () => [
    localPreset.value.output.container,
    localPreset.value.video.encoder.codec,
    localPreset.value.audio.encoder,
  ],
  () => {
    acknowledged.value = false
  },
)

async function selectDirectory() {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({ directory: true })
  if (selected && typeof selected === 'string') {
    localPreset.value.output.location = selected
    onChange()
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

.form-group > label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-color2, #808080);
}

.form-group input[type='text'],
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

.input-row .app-btn {
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

.timestamp-checkbox input[type='checkbox'] {
  -webkit-appearance: checkbox;
  appearance: checkbox;
  width: 16px;
  height: 16px;
  min-width: 16px;
  margin: 0;
  padding: 0;
  border: none;
  cursor: pointer;
  accent-color: var(--info-color, #3498db);
}

.compat-warning {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--warning-bg, rgba(255, 193, 7, 0.1));
  border: 1px solid var(--warning-border, rgba(255, 193, 7, 0.3));
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compat-warning span {
  font-size: 12px;
  color: var(--warning-color, #ffc107);
}

.compat-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.compat-btn {
  padding: 4px 10px;
  font-size: 12px;
}

.compat-warning .compat-hint,
.compat-warning .compat-acknowledged {
  color: var(--text-secondary, #8a8f98);
}
</style>

<template>
  <div class="color-panel">
    <div class="panel-section">
      <div class="section-header" @click="toggleSection('basic')">
        <h4>{{ t('page.params.colorPanel.basicAdjustments') }}</h4>
        <span class="toggle-icon">{{ expandedSections.basic ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.basic" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.colorPanel.brightness') }}</label>
          <div class="slider-group">
            <input type="range" min="-1" max="1" step="0.05"
              v-model="localPreset.video.colorManagement.brightness" @input="onColorChange" />
            <span class="param-value">{{ localPreset.video.colorManagement.brightness || '0' }}</span>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('page.params.colorPanel.contrast') }}</label>
          <div class="slider-group">
            <input type="range" min="0" max="2" step="0.05"
              v-model="localPreset.video.colorManagement.contrast" @input="onColorChange" />
            <span class="param-value">{{ localPreset.video.colorManagement.contrast || '1' }}</span>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('page.params.colorPanel.saturation') }}</label>
          <div class="slider-group">
            <input type="range" min="0" max="3" step="0.05"
              v-model="localPreset.video.colorManagement.saturation" @input="onColorChange" />
            <span class="param-value">{{ localPreset.video.colorManagement.saturation || '1' }}</span>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('page.params.colorPanel.gamma') }}</label>
          <div class="slider-group">
            <input type="range" min="0.1" max="10" step="0.1"
              :value="gammaSliderValue" @input="onGammaInput" />
            <span class="param-value">{{ gammaSliderValue }}</span>
          </div>
        </div>

        <button class="reset-btn" @click="resetBasic">{{ t('page.params.colorPanel.resetBasicAdjustments') }}</button>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('format')">
        <h4>{{ t('page.params.colorPanel.pixelFormat') }}</h4>
        <span class="toggle-icon">{{ expandedSections.format ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.format" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.colorPanel.pixelFormat') }}</label>
          <select v-model="localPreset.video.colorManagement.pixelFormat" @change="onColorChange">
            <option value="">{{ t('page.params.colorPanel.automatic') }}</option>
            <option value="yuv420p">YUV 4:2:0 (8-bit)</option>
            <option value="yuv422p">YUV 4:2:2 (8-bit)</option>
            <option value="yuv444p">YUV 4:4:4 (8-bit)</option>
            <option value="yuv420p10le">YUV 4:2:0 (10-bit)</option>
            <option value="yuv422p10le">YUV 4:2:2 (10-bit)</option>
            <option value="yuv444p10le">YUV 4:4:4 (10-bit)</option>
            <option value="yuv420p12le">YUV 4:2:0 (12-bit)</option>
            <option value="yuv444p12le">YUV 4:4:4 (12-bit)</option>
            <option value="rgb24">RGB 24-bit</option>
            <option value="rgba">RGBA 32-bit</option>
          </select>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('space')">
        <h4>{{ t('page.params.colorPanel.colorSpace') }}</h4>
        <span class="toggle-icon">{{ expandedSections.space ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.space" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.colorPanel.colorPrimaries') }}</label>
          <select v-model="localPreset.video.colorManagement.colorPrimaries" @change="onColorChange">
            <option value="">{{ t('page.params.colorPanel.automatic') }}</option>
            <option value="bt709">BT.709 (SDR)</option>
            <option value="bt2020">BT.2020 (HDR)</option>
            <option value="smpte432">DCI-P3</option>
          </select>
        </div>

        <div class="form-group">
          <label>{{ t('page.params.colorPanel.transferCharacteristics') }}</label>
          <select v-model="localPreset.video.colorManagement.colorTRC" @change="onColorChange">
            <option value="">{{ t('page.params.colorPanel.automatic') }}</option>
            <option value="bt709">BT.709 (SDR)</option>
            <option value="smpte2084">SMPTE ST 2084 (PQ)</option>
            <option value="arib-std-b67">HLG</option>
            <option value="linear">Linear</option>
          </select>
        </div>

        <div class="form-group">
          <label>{{ t('page.params.colorPanel.matrixCoefficients') }}</label>
          <select v-model="localPreset.video.colorManagement.colorSpace" @change="onColorChange">
            <option value="">{{ t('page.params.colorPanel.automatic') }}</option>
            <option value="bt709">BT.709</option>
            <option value="bt2020nc">BT.2020 NCL</option>
            <option value="bt2020c">BT.2020 CL</option>
            <option value="smpte2085">SMPTE 2085</option>
          </select>
        </div>

        <div class="form-group">
          <label>{{ t('page.params.colorPanel.colorRange') }}</label>
          <select v-model="localPreset.video.colorManagement.colorRange" @change="onColorChange">
            <option value="">{{ t('page.params.colorPanel.automatic') }}</option>
            <option value="tv">TV (Limited 16-235)</option>
            <option value="pc">PC (Full 0-255)</option>
          </select>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('tonemap')">
        <h4>{{ t('page.params.colorPanel.toneMapping') }}</h4>
        <span class="toggle-icon">{{ expandedSections.tonemap ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.tonemap" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.colorPanel.toneMappingAlgo') }}</label>
          <select v-model="localPreset.video.colorManagement.tonemapAlgo" @change="onColorChange">
            <option value="">{{ t('page.params.colorPanel.noToneMapping') }}</option>
            <option value="hable">Hable ({{ t('page.params.colorPanel.recommended') }})</option>
            <option value="mobius">Mobius</option>
            <option value="reinhard">Reinhard</option>
            <option value="bt2390">BT.2390</option>
            <option value="linear">Linear</option>
            <option value="clip">Clip</option>
          </select>
        </div>
        <small class="hint">{{ t('page.params.colorPanel.hdrToSdrHint') }}</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PresetData } from '@/types/preset';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const { t } = useI18n();

const localPreset = ref<PresetData>({ ...props.preset });

const expandedSections = reactive({
  basic: false,
  format: false,
  space: false,
  tonemap: false,
});

const gammaSliderValue = computed(() => localPreset.value.video.colorManagement.gamma || '1');

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
}, { deep: true });

function toggleSection(section: keyof typeof expandedSections) {
  expandedSections[section] = !expandedSections[section];
}

function onColorChange() {
  emit('update:preset', localPreset.value);
}

function onGammaInput(event: Event) {
  const input = event.target as HTMLInputElement;
  localPreset.value.video.colorManagement.gamma = input.value;
  onColorChange();
}

function resetBasic() {
  localPreset.value.video.colorManagement.brightness = '';
  localPreset.value.video.colorManagement.contrast = '';
  localPreset.value.video.colorManagement.saturation = '';
  localPreset.value.video.colorManagement.gamma = '';
  onColorChange();
}
</script>

<style scoped>
.color-panel {
  padding: 1rem;
}

.panel-section {
  border: 1px solid var(--border-color1, #333);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background: var(--bg-color2, #1e1e1e);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  background: var(--bg-color3, #2a2a2a);
}

.section-header:hover {
  background: var(--hover-bg, #333);
}

.section-header h4 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-color1, #e0e0e0);
}

.toggle-icon {
  font-size: 0.8rem;
  color: var(--text-color2, #999);
}

.section-content {
  padding: 1rem;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-color2, #999);
}

.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color1, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.85rem;
  box-sizing: border-box;
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.slider-group input[type="range"] {
  flex: 1;
  height: 6px;
  cursor: pointer;
}

.param-value {
  min-width: 40px;
  text-align: right;
  font-size: 0.8rem;
  color: var(--text-color2, #999);
  font-family: monospace;
}

.reset-btn {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.75rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color3, #3a3a3a);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.85rem;
  cursor: pointer;
}

.reset-btn:hover {
  background: var(--hover-bg, #444);
}

.hint {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-color2, #999);
}
</style>

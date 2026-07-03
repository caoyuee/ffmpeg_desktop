<template>
  <div class="filter-panel">
    <div class="panel-section">
      <div class="section-header" @click="toggleSection('deinterlace')">
        <h4>{{ t('page.params.filterPanel.deinterlace') }}</h4>
        <AppIcon :name="expandedSections.deinterlace ? 'chevron-down' : 'chevron-right'" :size="14" class="toggle-icon" />
      </div>
      <div v-show="expandedSections.deinterlace" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.filterPanel.deinterlaceMode') }}</label>
          <select v-model="localPreset.video.filters.deinterlace" @change="onFilterChange">
            <option :value="0">{{ t('common.none') }}</option>
            <option :value="1">YADIF - {{ t('page.params.filterPanel.fieldOrderAdaptive') }}</option>
            <option :value="2">YADIF - {{ t('page.params.filterPanel.fieldOrderForced') }}</option>
            <option :value="3">BWDIF - {{ t('page.params.filterPanel.fieldOrderAdaptive') }}</option>
            <option :value="4">BWDIF - {{ t('page.params.filterPanel.fieldOrderForced') }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('denoise')">
        <h4>{{ t('page.params.filterPanel.denoise') }}</h4>
        <AppIcon :name="expandedSections.denoise ? 'chevron-down' : 'chevron-right'" :size="14" class="toggle-icon" />
      </div>
      <div v-show="expandedSections.denoise" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.filterPanel.denoiseMode') }}</label>
          <select v-model="localPreset.video.filters.denoise.method" @change="onDenoiseMethodChange">
            <option value="">{{ t('common.none') }}</option>
            <option value="hqdn3d">HQDN3D - 快速降噪</option>
            <option value="nlmeans">NLMeans - 高质量降噪</option>
            <option value="atadenoise">ATADenoise - 时域降噪</option>
          </select>
        </div>

        <div v-if="localPreset.video.filters.denoise.method === 'hqdn3d'" class="params-group">
          <div class="form-group">
            <label>{{ t('page.params.filterPanel.lumaStrength') }}</label>
            <input type="range" min="0" max="20" step="0.5" 
              v-model.number="localPreset.video.filters.denoise.param1" @input="onFilterChange" />
            <span class="param-value">{{ localPreset.video.filters.denoise.param1 || 4 }}</span>
          </div>
          <div class="form-group">
            <label>{{ t('page.params.filterPanel.chromaStrength') }}</label>
            <input type="range" min="0" max="20" step="0.5"
              v-model.number="localPreset.video.filters.denoise.param2" @input="onFilterChange" />
            <span class="param-value">{{ localPreset.video.filters.denoise.param2 || 3 }}</span>
          </div>
        </div>

        <div v-if="localPreset.video.filters.denoise.method === 'nlmeans'" class="params-group">
          <div class="form-group">
            <label>{{ t('page.params.filterPanel.denoiseStrength') }}</label>
            <input type="range" min="1" max="20" step="0.5"
              v-model.number="localPreset.video.filters.denoise.param1" @input="onFilterChange" />
            <span class="param-value">{{ localPreset.video.filters.denoise.param1 || 3 }}</span>
          </div>
        </div>

        <div v-if="localPreset.video.filters.denoise.method === 'atadenoise'" class="params-group">
          <div class="form-group">
            <label>{{ t('page.params.filterPanel.denoiseStrength') }}</label>
            <input type="range" min="0.001" max="0.1" step="0.001"
              v-model.number="localPreset.video.filters.denoise.param1" @input="onFilterChange" />
            <span class="param-value">{{ localPreset.video.filters.denoise.param1 || 0.02 }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('sharpen')">
        <h4>{{ t('page.params.filterPanel.sharpen') }}</h4>
        <AppIcon :name="expandedSections.sharpen ? 'chevron-down' : 'chevron-right'" :size="14" class="toggle-icon" />
      </div>
      <div v-show="expandedSections.sharpen" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.filterPanel.sharpenStrength') }}</label>
          <input type="range" min="0" max="2" step="0.1"
            v-model.number="localPreset.video.filters.sharpen.lumaAmount" @input="onFilterChange" />
          <span class="param-value">{{ localPreset.video.filters.sharpen.lumaAmount || t('page.params.notSet') }}</span>
        </div>
        <div v-if="localPreset.video.filters.sharpen.lumaAmount" class="params-group">
          <div class="form-group">
            <label>{{ t('page.params.filterPanel.horizontalRadius') }}</label>
            <input type="number" min="1" max="15"
              v-model="localPreset.video.filters.sharpen.lumaMsizeX" @input="onFilterChange" />
          </div>
          <div class="form-group">
            <label>{{ t('page.params.filterPanel.verticalRadius') }}</label>
            <input type="number" min="1" max="15"
              v-model="localPreset.video.filters.sharpen.lumaMsizeY" @input="onFilterChange" />
          </div>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('transform')">
        <h4>{{ t('page.params.filterPanel.transform') }}</h4>
        <AppIcon :name="expandedSections.transform ? 'chevron-down' : 'chevron-right'" :size="14" class="toggle-icon" />
      </div>
      <div v-show="expandedSections.transform" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.filterPanel.rotation') }}</label>
          <select v-model.number="localPreset.video.filters.rotation" @change="onFilterChange">
            <option :value="0">{{ t('page.params.filterPanel.noRotation') }}</option>
            <option :value="1">{{ t('page.params.filterPanel.clockwise90') }}</option>
            <option :value="2">180°</option>
            <option :value="3">{{ t('page.params.filterPanel.counterClockwise90') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ t('page.params.filterPanel.flip') }}</label>
          <select v-model.number="localPreset.video.filters.flip" @change="onFilterChange">
            <option :value="0">{{ t('page.params.filterPanel.noFlip') }}</option>
            <option :value="1">{{ t('page.params.filterPanel.horizontalFlip') }}</option>
            <option :value="2">{{ t('page.params.filterPanel.verticalFlip') }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header">
        <h4>{{ t('page.params.filterPanel.advancedTools') }}</h4>
      </div>
      <div class="section-content">
        <div class="tool-buttons">
          <button class="app-btn tool-btn" @click="showInterpolation = true">{{ t('page.params.filterPanel.interpolationTool') }}</button>
          <button class="app-btn tool-btn" @click="showFrameBlend = true">{{ t('page.params.filterPanel.frameBlendTool') }}</button>
          <button class="app-btn tool-btn" @click="showSuperResolution = true">{{ t('page.params.filterPanel.superResolutionTool') }}</button>
        </div>
      </div>
    </div>

    <InterpolationDialog 
      :visible="showInterpolation" 
      :modelValue="localPreset.video.filters.interpolation" 
      @update:visible="showInterpolation = $event"
      @update:modelValue="onInterpolationUpdate" 
    />
    <FrameBlendDialog 
      :visible="showFrameBlend" 
      :modelValue="localPreset.video.filters.frameBlend"
      @update:visible="showFrameBlend = $event"
      @update:modelValue="onFrameBlendUpdate" 
    />
    <SuperResolutionDialog 
      :visible="showSuperResolution" 
      :modelValue="localPreset.video.filters.superResolution"
      @update:visible="showSuperResolution = $event"
      @update:modelValue="onSuperResolutionUpdate" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PresetData } from '@/types/preset';
import AppIcon from '@/components/AppIcon/AppIcon.vue';
import InterpolationDialog from '@/components/Dialogs/InterpolationDialog.vue';
import FrameBlendDialog from '@/components/Dialogs/FrameBlendDialog.vue';
import SuperResolutionDialog from '@/components/Dialogs/SuperResolutionDialog.vue';

const { t } = useI18n();

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });

const expandedSections = reactive({
  deinterlace: false,
  denoise: false,
  sharpen: false,
  transform: false,
});

const showInterpolation = ref(false);
const showFrameBlend = ref(false);
const showSuperResolution = ref(false);

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
}, { deep: true });

function toggleSection(section: keyof typeof expandedSections) {
  expandedSections[section] = !expandedSections[section];
}

function onFilterChange() {
  emit('update:preset', localPreset.value);
}

function onInterpolationUpdate(settings: PresetData['video']['filters']['interpolation']) {
  localPreset.value.video.filters.interpolation = settings;
  emit('update:preset', localPreset.value);
}

function onFrameBlendUpdate(settings: PresetData['video']['filters']['frameBlend']) {
  localPreset.value.video.filters.frameBlend = settings;
  emit('update:preset', localPreset.value);
}

function onSuperResolutionUpdate(settings: PresetData['video']['filters']['superResolution']) {
  localPreset.value.video.filters.superResolution = settings;
  emit('update:preset', localPreset.value);
}

function onDenoiseMethodChange() {
  const method = localPreset.value.video.filters.denoise.method;
  if (method === 'hqdn3d') {
    localPreset.value.video.filters.denoise.param1 = '4';
    localPreset.value.video.filters.denoise.param2 = '3';
    localPreset.value.video.filters.denoise.param3 = '6';
    localPreset.value.video.filters.denoise.param4 = '4';
  } else if (method === 'nlmeans') {
    localPreset.value.video.filters.denoise.param1 = '3';
    localPreset.value.video.filters.denoise.param2 = '';
    localPreset.value.video.filters.denoise.param3 = '';
    localPreset.value.video.filters.denoise.param4 = '';
  } else if (method === 'atadenoise') {
    localPreset.value.video.filters.denoise.param1 = '0.02';
    localPreset.value.video.filters.denoise.param2 = '';
    localPreset.value.video.filters.denoise.param3 = '';
    localPreset.value.video.filters.denoise.param4 = '';
  } else {
    localPreset.value.video.filters.denoise.param1 = '';
    localPreset.value.video.filters.denoise.param2 = '';
    localPreset.value.video.filters.denoise.param3 = '';
    localPreset.value.video.filters.denoise.param4 = '';
  }
  onFilterChange();
}
</script>

<style scoped>
.filter-panel {
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

.form-group select,
.form-group input[type="number"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color1, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.85rem;
}

.form-group input[type="range"] {
  width: calc(100% - 50px);
  vertical-align: middle;
}

.param-value {
  display: inline-block;
  width: 45px;
  text-align: right;
  font-size: 0.8rem;
  color: var(--text-color2, #999);
}

.params-group {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color1, #333);
}

.tool-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

</style>

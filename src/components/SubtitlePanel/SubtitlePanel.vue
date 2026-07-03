<template>
  <div class="subtitle-panel">
    <div class="panel-section">
      <div class="section-header" @click="toggleSection('source')">
        <h4>{{ t('page.params.subtitlePanel.subtitleBurn') }}</h4>
        <AppIcon :name="expandedSections.source ? 'chevron-down' : 'chevron-right'" :size="14" class="toggle-icon" />
      </div>
      <div v-show="expandedSections.source" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.subtitlePanel.subtitleMode') }}</label>
          <select v-model="subtitleMode" @change="onModeChange">
            <option value="none">{{ t('page.params.subtitlePanel.noSubtitle') }}</option>
            <option value="external">{{ t('page.params.subtitlePanel.externalSubtitle') }}</option>
            <option value="embedded">{{ t('page.params.subtitlePanel.embeddedSubtitle') }}</option>
          </select>
        </div>

        <div v-if="subtitleMode === 'external'" class="params-group">
          <div class="form-group">
            <label>{{ t('page.params.subtitlePanel.subtitleFile') }}</label>
            <div class="file-input-group">
              <input type="text" v-model="localPreset.video.subtitleBurn.externalFileName" 
                :placeholder="t('page.params.subtitlePanel.subtitleFilePlaceholder')" readonly />
              <button type="button" class="app-btn app-btn--primary" @click="selectSubtitleFile">{{ t('page.params.subtitlePanel.select') }}</button>
            </div>
          </div>
        </div>

        <div v-if="subtitleMode === 'embedded'" class="params-group">
          <div class="form-group">
            <label>{{ t('page.params.subtitlePanel.subtitleStreamIndex') }}</label>
            <input type="number" min="0" v-model="localPreset.video.subtitleBurn.streamIndex" 
              @input="onSubtitleChange" />
          </div>
        </div>
      </div>
    </div>

    <div v-if="subtitleMode !== 'none'" class="panel-section">
      <div class="section-header" @click="toggleSection('style')">
        <h4>{{ t('page.params.subtitlePanel.fontStyle') }}</h4>
        <AppIcon :name="expandedSections.style ? 'chevron-down' : 'chevron-right'" :size="14" class="toggle-icon" />
      </div>
      <div v-show="expandedSections.style" class="section-content">
        <div class="form-row">
          <div class="form-group half">
            <label>{{ t('page.params.subtitlePanel.fontName') }}</label>
            <input type="text" v-model="localPreset.video.subtitleBurn.style.fontName" 
              @input="onSubtitleChange" :placeholder="t('page.params.subtitlePanel.fontNamePlaceholder')" />
          </div>
          <div class="form-group half">
            <label>{{ t('page.params.subtitlePanel.fontSize') }}</label>
            <input type="number" min="8" max="72" 
              v-model.number="localPreset.video.subtitleBurn.style.fontSize" 
              @input="onSubtitleChange" />
          </div>
        </div>

        <div class="form-row checkbox-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.video.subtitleBurn.style.bold" 
              @change="onSubtitleChange" />
            <span>{{ t('page.params.subtitlePanel.bold') }}</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.video.subtitleBurn.style.italic" 
              @change="onSubtitleChange" />
            <span>{{ t('page.params.subtitlePanel.italic') }}</span>
          </label>
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label>{{ t('page.params.subtitlePanel.primaryColor') }}</label>
            <div class="color-input-group">
              <input type="color" v-model="primaryColorHex" @input="onColorChange('primary')" />
              <input type="text" v-model="primaryColorHex" @input="onColorChange('primary')" 
                class="color-text" />
            </div>
          </div>
          <div class="form-group half">
            <label>{{ t('page.params.subtitlePanel.outlineColor') }}</label>
            <div class="color-input-group">
              <input type="color" v-model="outlineColorHex" @input="onColorChange('outline')" />
              <input type="text" v-model="outlineColorHex" @input="onColorChange('outline')" 
                class="color-text" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="subtitleMode !== 'none'" class="panel-section">
      <div class="section-header" @click="toggleSection('position')">
        <h4>{{ t('page.params.subtitlePanel.borderAndPosition') }}</h4>
        <AppIcon :name="expandedSections.position ? 'chevron-down' : 'chevron-right'" :size="14" class="toggle-icon" />
      </div>
      <div v-show="expandedSections.position" class="section-content">
        <div class="form-row">
          <div class="form-group half">
            <label>{{ t('page.params.subtitlePanel.outlineWidth') }}</label>
            <input type="number" min="0" max="10" step="0.5"
              v-model="localPreset.video.subtitleBurn.outlineWidth" 
              @input="onSubtitleChange" />
          </div>
          <div class="form-group half">
            <label>{{ t('page.params.subtitlePanel.shadowDistance') }}</label>
            <input type="number" min="0" max="10" step="0.5"
              v-model="localPreset.video.subtitleBurn.shadowDistance" 
              @input="onSubtitleChange" />
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('page.params.subtitlePanel.alignment') }}</label>
          <select v-model.number="localPreset.video.subtitleBurn.alignment" @change="onSubtitleChange">
            <option :value="0">{{ t('page.params.subtitlePanel.default') }}</option>
            <option :value="1">{{ t('page.params.subtitlePanel.topLeft') }}</option>
            <option :value="2">{{ t('page.params.subtitlePanel.topCenter') }}</option>
            <option :value="3">{{ t('page.params.subtitlePanel.topRight') }}</option>
            <option :value="4">{{ t('page.params.subtitlePanel.middleLeft') }}</option>
            <option :value="5">{{ t('page.params.subtitlePanel.middleCenter') }}</option>
            <option :value="6">{{ t('page.params.subtitlePanel.middleRight') }}</option>
            <option :value="7">{{ t('page.params.subtitlePanel.bottomLeft') }}</option>
            <option :value="8">{{ t('page.params.subtitlePanel.bottomCenter') }}</option>
            <option :value="9">{{ t('page.params.subtitlePanel.bottomRight') }}</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group third">
            <label>{{ t('page.params.subtitlePanel.leftMargin') }}</label>
            <input type="number" min="0" v-model="localPreset.video.subtitleBurn.marginL" 
              @input="onSubtitleChange" />
          </div>
          <div class="form-group third">
            <label>{{ t('page.params.subtitlePanel.rightMargin') }}</label>
            <input type="number" min="0" v-model="localPreset.video.subtitleBurn.marginR" 
              @input="onSubtitleChange" />
          </div>
          <div class="form-group third">
            <label>{{ t('page.params.subtitlePanel.verticalMargin') }}</label>
            <input type="number" min="0" v-model="localPreset.video.subtitleBurn.marginV" 
              @input="onSubtitleChange" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PresetData } from '@/types/preset';
import AppIcon from '@/components/AppIcon/AppIcon.vue';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const { t } = useI18n();

const localPreset = ref<PresetData>({ ...props.preset });
const subtitleMode = ref<'none' | 'external' | 'embedded'>('none');
const primaryColorHex = ref('#ffffff');
const outlineColorHex = ref('#000000');

const expandedSections = reactive({
  source: false,
  style: false,
  position: false,
});

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
  updateSubtitleMode();
}, { deep: true });

function updateSubtitleMode() {
  if (localPreset.value.video.subtitleBurn.externalFile) {
    subtitleMode.value = 'external';
  } else if (localPreset.value.video.subtitleBurn.embeddedStream) {
    subtitleMode.value = 'embedded';
  } else {
    subtitleMode.value = 'none';
  }
  
  if (localPreset.value.video.subtitleBurn.primaryColor) {
    primaryColorHex.value = localPreset.value.video.subtitleBurn.primaryColor;
  }
  if (localPreset.value.video.subtitleBurn.outlineColor) {
    outlineColorHex.value = localPreset.value.video.subtitleBurn.outlineColor;
  }
}

function toggleSection(section: keyof typeof expandedSections) {
  expandedSections[section] = !expandedSections[section];
}

function onModeChange() {
  localPreset.value.video.subtitleBurn.externalFile = subtitleMode.value === 'external';
  localPreset.value.video.subtitleBurn.embeddedStream = subtitleMode.value === 'embedded';
  
  if (subtitleMode.value === 'none') {
    localPreset.value.video.subtitleBurn.externalFileName = '';
    localPreset.value.video.subtitleBurn.streamIndex = '';
  }
  
  onSubtitleChange();
}

async function selectSubtitleFile() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      multiple: false,
      filters: [{
        name: t('page.params.subtitlePanel.subtitleFiles'),
        extensions: ['srt', 'ass', 'ssa', 'sub']
      }]
    });
    
    if (selected && typeof selected === 'string') {
      localPreset.value.video.subtitleBurn.externalFileName = selected;
      onSubtitleChange();
    }
  } catch (error) {
    console.error(t('page.params.subtitlePanel.selectSubtitleFailed'), error);
  }
}

function onColorChange(type: 'primary' | 'outline') {
  if (type === 'primary') {
    localPreset.value.video.subtitleBurn.primaryColor = primaryColorHex.value;
  } else {
    localPreset.value.video.subtitleBurn.outlineColor = outlineColorHex.value;
  }
  onSubtitleChange();
}

function onSubtitleChange() {
  emit('update:preset', localPreset.value);
}

onMounted(() => {
  updateSubtitleMode();
});
</script>

<style scoped>
.subtitle-panel {
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
.form-group input[type="text"],
.form-group input[type="number"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color1, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.85rem;
  box-sizing: border-box;
}

.form-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-group.half {
  flex: 1;
}

.form-group.third {
  flex: 1;
}

.params-group {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color1, #333);
}

.checkbox-row {
  align-items: center;
  gap: 1.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-color1, #e0e0e0);
}

.checkbox-label input[type="checkbox"] {
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

.file-input-group {
  display: flex;
  gap: 0.5rem;
}

.file-input-group input {
  flex: 1;
}

.file-input-group .app-btn {
  white-space: nowrap;
}

.color-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-input-group input[type="color"] {
  width: 36px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}

.color-input-group .color-text {
  flex: 1;
  text-transform: uppercase;
}
</style>

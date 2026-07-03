<template>
  <div class="stream-panel">
    <div class="panel-section">
      <div class="section-header" @click="toggleSection('video')">
        <h4>{{ t('page.params.streamPanel.videoStream') }}</h4>
        <AppIcon :name="expandedSections.video ? 'chevron-down' : 'chevron-right'" :size="14" class="toggle-icon" />
      </div>
      <div v-show="expandedSections.video" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.streamPanel.videoStreamIndex') }}</label>
          <input type="text" v-model="videoStreamsText" @input="onVideoStreamsChange"
            :placeholder="t('page.params.streamPanel.videoStreamPlaceholder')" />
          <small>{{ t('page.params.streamPanel.defaultVideoStreamHint') }}</small>
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.keepOtherVideo" 
              @change="onStreamChange" />
            <span>{{ t('page.params.streamPanel.keepOtherVideo') }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('audio')">
        <h4>{{ t('page.params.streamPanel.audioStream') }}</h4>
        <AppIcon :name="expandedSections.audio ? 'chevron-down' : 'chevron-right'" :size="14" class="toggle-icon" />
      </div>
      <div v-show="expandedSections.audio" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.streamPanel.audioStreamIndex') }}</label>
          <input type="text" v-model="audioStreamsText" @input="onAudioStreamsChange"
            :placeholder="t('page.params.streamPanel.audioStreamPlaceholder')" />
          <small>{{ t('page.params.streamPanel.defaultAudioStreamHint') }}</small>
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.keepOtherAudio" 
              @change="onStreamChange" />
            <span>{{ t('page.params.streamPanel.keepOtherAudio') }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('subtitle')">
        <h4>{{ t('page.params.streamPanel.subtitleStream') }}</h4>
        <AppIcon :name="expandedSections.subtitle ? 'chevron-down' : 'chevron-right'" :size="14" class="toggle-icon" />
      </div>
      <div v-show="expandedSections.subtitle" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.streamPanel.subtitleOperation') }}</label>
          <select v-model.number="localPreset.streamControl.subtitleOperation" @change="onStreamChange">
            <option :value="0">{{ t('page.params.streamPanel.noProcessing') }}</option>
            <option :value="1">{{ t('page.params.streamPanel.burnToVideo') }}</option>
            <option :value="2">{{ t('page.params.streamPanel.muxToOutput') }}</option>
            <option :value="3">{{ t('page.params.streamPanel.discard') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ t('page.params.streamPanel.subtitleStreamIndex') }}</label>
          <input type="text" v-model="subtitleStreamsText" @input="onSubtitleStreamsChange"
            :placeholder="t('page.params.streamPanel.subtitleStreamPlaceholder')" />
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.keepOtherSubtitle" 
              @change="onStreamChange" />
            <span>{{ t('page.params.streamPanel.keepOtherSubtitle') }}</span>
          </label>
        </div>
        <div class="form-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.autoMuxSRT" 
              @change="onStreamChange" />
            <span>{{ t('page.params.streamPanel.autoMuxSrt') }}</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.autoMuxASS" 
              @change="onStreamChange" />
            <span>{{ t('page.params.streamPanel.autoMuxAss') }}</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.autoMuxSSA" 
              @change="onStreamChange" />
            <span>{{ t('page.params.streamPanel.autoMuxSsa') }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('metadata')">
        <h4>{{ t('page.params.streamPanel.metadataAndChapter') }}</h4>
        <AppIcon :name="expandedSections.metadata ? 'chevron-down' : 'chevron-right'" :size="14" class="toggle-icon" />
      </div>
      <div v-show="expandedSections.metadata" class="section-content">
        <div class="form-group">
          <label>{{ t('page.params.streamPanel.metadataOption') }}</label>
          <select v-model.number="localPreset.streamControl.metadataOption" @change="onStreamChange">
            <option :value="0">{{ t('page.params.streamPanel.keepMetadata') }}</option>
            <option :value="1">{{ t('page.params.streamPanel.removeMetadata') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ t('page.params.streamPanel.chapterOption') }}</label>
          <select v-model.number="localPreset.streamControl.chapterOption" @change="onStreamChange">
            <option :value="0">{{ t('page.params.streamPanel.keepChapters') }}</option>
            <option :value="1">{{ t('page.params.streamPanel.removeChapters') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ t('page.params.streamPanel.attachmentOption') }}</label>
          <select v-model.number="localPreset.streamControl.attachmentOption" @change="onStreamChange">
            <option :value="0">{{ t('page.params.streamPanel.keepAttachments') }}</option>
            <option :value="1">{{ t('page.params.streamPanel.removeAttachments') }}</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
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

const expandedSections = reactive({
  video: false,
  audio: false,
  subtitle: false,
  metadata: false,
});

const videoStreamsText = computed({
  get: () => localPreset.value.streamControl.videoStreams.join(','),
  set: () => {}
});

const audioStreamsText = computed({
  get: () => localPreset.value.streamControl.audioStreams.join(','),
  set: () => {}
});

const subtitleStreamsText = computed({
  get: () => localPreset.value.streamControl.subtitleStreams.join(','),
  set: () => {}
});

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
}, { deep: true });

function toggleSection(section: keyof typeof expandedSections) {
  expandedSections[section] = !expandedSections[section];
}

function parseStreams(text: string): string[] {
  return text.split(',')
    .map(s => s.trim())
    .filter(s => s !== '');
}

function onVideoStreamsChange(event: Event) {
  const target = event.target as HTMLInputElement;
  localPreset.value.streamControl.videoStreams = parseStreams(target.value);
  onStreamChange();
}

function onAudioStreamsChange(event: Event) {
  const target = event.target as HTMLInputElement;
  localPreset.value.streamControl.audioStreams = parseStreams(target.value);
  onStreamChange();
}

function onSubtitleStreamsChange(event: Event) {
  const target = event.target as HTMLInputElement;
  localPreset.value.streamControl.subtitleStreams = parseStreams(target.value);
  onStreamChange();
}

function onStreamChange() {
  emit('update:preset', localPreset.value);
}
</script>

<style scoped>
.stream-panel {
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

.form-group input[type="text"],
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

.form-group small {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-color2, #999);
}

.checkbox-group {
  margin-top: 0.5rem;
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

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
}
</style>

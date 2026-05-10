<template>
  <div class="stream-panel">
    <div class="panel-section">
      <div class="section-header" @click="toggleSection('video')">
        <h4>视频流</h4>
        <span class="toggle-icon">{{ expandedSections.video ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.video" class="section-content">
        <div class="form-group">
          <label>视频流索引 (逗号分隔)</label>
          <input type="text" v-model="videoStreamsText" @input="onVideoStreamsChange"
            placeholder="例如: 0,1,2" />
          <small>留空表示使用默认视频流</small>
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.keepOtherVideo" 
              @change="onStreamChange" />
            <span>保留其他视频流</span>
          </label>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('audio')">
        <h4>音频流</h4>
        <span class="toggle-icon">{{ expandedSections.audio ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.audio" class="section-content">
        <div class="form-group">
          <label>音频流索引 (逗号分隔)</label>
          <input type="text" v-model="audioStreamsText" @input="onAudioStreamsChange"
            placeholder="例如: 0,1,2" />
          <small>留空表示使用默认音频流</small>
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.keepOtherAudio" 
              @change="onStreamChange" />
            <span>保留其他音频流</span>
          </label>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('subtitle')">
        <h4>字幕流</h4>
        <span class="toggle-icon">{{ expandedSections.subtitle ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.subtitle" class="section-content">
        <div class="form-group">
          <label>字幕操作</label>
          <select v-model.number="localPreset.streamControl.subtitleOperation" @change="onStreamChange">
            <option :value="0">不处理</option>
            <option :value="1">烧录到视频</option>
            <option :value="2">混流到输出</option>
            <option :value="3">丢弃</option>
          </select>
        </div>
        <div class="form-group">
          <label>字幕流索引 (逗号分隔)</label>
          <input type="text" v-model="subtitleStreamsText" @input="onSubtitleStreamsChange"
            placeholder="例如: 0,1,2" />
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.keepOtherSubtitle" 
              @change="onStreamChange" />
            <span>保留其他字幕流</span>
          </label>
        </div>
        <div class="form-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.autoMuxSRT" 
              @change="onStreamChange" />
            <span>自动混流 SRT</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.autoMuxASS" 
              @change="onStreamChange" />
            <span>自动混流 ASS</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.streamControl.autoMuxSSA" 
              @change="onStreamChange" />
            <span>自动混流 SSA</span>
          </label>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('metadata')">
        <h4>元数据与章节</h4>
        <span class="toggle-icon">{{ expandedSections.metadata ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.metadata" class="section-content">
        <div class="form-group">
          <label>元数据处理</label>
          <select v-model.number="localPreset.streamControl.metadataOption" @change="onStreamChange">
            <option :value="0">保留元数据</option>
            <option :value="1">删除元数据</option>
          </select>
        </div>
        <div class="form-group">
          <label>章节处理</label>
          <select v-model.number="localPreset.streamControl.chapterOption" @change="onStreamChange">
            <option :value="0">保留章节</option>
            <option :value="1">删除章节</option>
          </select>
        </div>
        <div class="form-group">
          <label>附件处理</label>
          <select v-model.number="localPreset.streamControl.attachmentOption" @change="onStreamChange">
            <option :value="0">保留附件</option>
            <option :value="1">删除附件</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import type { PresetData } from '@/types/preset';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

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
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
}
</style>

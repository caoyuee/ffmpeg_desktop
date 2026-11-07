<template>
  <div class="preset-manager">
    <div class="preset-header">
      <h3>{{ t('page.params.presetPanel.title') }}</h3>
      <div class="preset-actions">
        <button class="app-btn app-btn--primary" @click="createNewPreset">
          <AppIcon name="add" :size="16" />
          {{ t('page.params.presetPanel.create') }}
        </button>
        <button class="app-btn" @click="importPreset">
          <AppIcon name="folder-open" :size="16" />
          {{ t('page.params.presetPanel.import') }}
        </button>
        <button class="app-btn" data-testid="import-share-text" @click="openShareImport">
          <AppIcon name="add" :size="16" />
          {{ t('page.params.presetPanel.importFromText') }}
        </button>
      </div>
    </div>

    <div class="preset-list">
      <div
        v-for="preset in presetStore.presets"
        :key="preset.id"
        class="preset-item"
        :class="{ active: preset.id === presetStore.currentPreset.id }"
        @click="selectPreset(preset)"
      >
        <div class="preset-info">
          <div class="preset-name">{{ preset.name }}</div>
          <div class="preset-meta">
            <span>{{ preset.output.container }}</span>
            <span v-if="preset.video.encoder.codec">{{ preset.video.encoder.codec }}</span>
          </div>
        </div>
        <div class="preset-item-actions">
          <button :title="t('common.edit')" @click.stop="editPreset(preset)">
            <AppIcon name="edit" :size="15" />
          </button>
          <button
            :title="t('page.params.presetPanel.share')"
            data-testid="share-preset"
            @click.stop="sharePreset(preset)"
          >
            <AppIcon name="share" :size="15" />
          </button>
          <button :title="t('preset.export')" @click.stop="exportPreset(preset)">
            <AppIcon name="export" :size="15" />
          </button>
          <button :title="t('preset.delete')" @click.stop="deletePreset(preset.id)">
            <AppIcon name="trash" :size="15" />
          </button>
        </div>
      </div>

      <div v-if="presetStore.presets.length === 0" class="empty-tip">
        <p>{{ t('page.params.presetPanel.emptyTitle') }}</p>
        <small>{{ t('page.params.presetPanel.emptyHint') }}</small>
      </div>
    </div>

    <div v-if="showEditor" class="preset-editor-overlay" @click="closeEditor">
      <div class="preset-editor" @click.stop>
        <div class="editor-header">
          <h4>
            {{
              editorMode === 'create'
                ? t('page.params.presetPanel.create')
                : t('page.params.presetPanel.edit')
            }}
          </h4>
          <button class="app-btn app-btn--icon" @click="closeEditor">
            <AppIcon name="close" :size="16" />
          </button>
        </div>

        <div class="editor-content">
          <div class="form-group">
            <label>{{ t('page.params.presetPanel.name') }}</label>
            <input
              v-model="editingPreset.name"
              type="text"
              :placeholder="t('page.params.presetPanel.namePlaceholder')"
            />
          </div>

          <div class="form-group">
            <label>{{ t('page.params.presetPanel.outputContainer') }}</label>
            <select v-model="editingPreset.output.container">
              <option value="mp4">MP4</option>
              <option value="mkv">MKV</option>
              <option value="webm">WebM</option>
              <option value="avi">AVI</option>
            </select>
          </div>

          <div class="form-group">
            <label>{{ t('page.params.presetPanel.videoEncoder') }}</label>
            <select v-model="editingPreset.video.encoder.codec">
              <option value="">{{ t('page.params.presetPanel.copyStream') }}</option>
              <option value="libx264">H.264 (libx264)</option>
              <option value="libx265">H.265 (libx265)</option>
              <option value="libvpx-vp9">VP9 (libvpx-vp9)</option>
              <option value="libaom-av1">AV1 (libaom-av1)</option>
            </select>
          </div>

          <div v-if="editingPreset.video.encoder.codec" class="form-group">
            <label>{{ t('page.params.presetPanel.quality') }}</label>
            <input
              v-model="editingPreset.video.bitrateControl.qualityValue"
              type="number"
              min="0"
              max="51"
              :placeholder="t('page.params.presetPanel.defaultQualityValue')"
            />
          </div>

          <div class="form-group">
            <label>{{ t('page.params.presetPanel.audioEncoder') }}</label>
            <select v-model="editingPreset.audio.encoder">
              <option value="">{{ t('page.params.presetPanel.copyStream') }}</option>
              <option value="aac">AAC</option>
              <option value="libmp3lame">MP3</option>
              <option value="libopus">Opus</option>
              <option value="libvorbis">Vorbis</option>
            </select>
          </div>
        </div>

        <div class="editor-footer">
          <button class="app-btn" @click="closeEditor">{{ t('common.cancel') }}</button>
          <button class="app-btn app-btn--primary" @click="savePreset">
            {{ t('common.save') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showShareDialog" class="preset-editor-overlay" @click="closeShareDialog">
      <div class="preset-editor share-dialog" data-testid="share-dialog" @click.stop>
        <div class="editor-header">
          <h4>{{ t('preset.share.title') }}</h4>
          <button class="app-btn app-btn--icon" data-testid="share-close" @click="closeShareDialog">
            <AppIcon name="close" :size="16" />
          </button>
        </div>

        <div class="editor-content">
          <div class="form-group">
            <label>{{ t('preset.share.inputPlaceholder') }}</label>
            <textarea
              v-model="shareInputText"
              rows="5"
              :placeholder="t('preset.share.inputPlaceholder')"
              data-testid="share-input"
            ></textarea>
            <small class="share-hint">{{ t('preset.share.inputHint') }}</small>
          </div>

          <div class="form-group">
            <label>{{ t('preset.share.outputHint') }}</label>
            <textarea
              :value="shareOutputText"
              rows="4"
              readonly
              data-testid="share-output"
            ></textarea>
          </div>

          <p v-if="shareError" class="share-error" data-testid="share-error">{{ shareError }}</p>
        </div>

        <div class="editor-footer">
          <button class="app-btn" @click="closeShareDialog">{{ t('common.cancel') }}</button>
          <button
            v-if="shareOutputText"
            class="app-btn"
            data-testid="share-copy"
            @click="copyShareOutput"
          >
            {{ t('preset.share.copyAction') }}
          </button>
          <button
            class="app-btn app-btn--primary"
            data-testid="share-import-confirm"
            @click="confirmShareImport"
          >
            {{ t('preset.share.importAction') }}
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      :title="t('page.params.presetPanel.deleteTitle')"
      :message="t('page.params.presetPanel.deleteMessage')"
      :confirm-text="t('common.confirm')"
      :cancel-text="t('common.cancel')"
      @confirm="confirmDelete"
    />

    <Toast v-model="showToast" :message="toastMessage" :type="toastType" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePresetStore } from '@/store/presetStore'
import { createDefaultPreset, normalizePreset } from '@/config/presetSchema'
import type { PresetData } from '@/types/preset'
import {
  PresetShareError,
  suggestShareFileName,
  type PresetShareErrorCode,
} from '@/config/presetShare'
import { open, save } from '@tauri-apps/plugin-dialog'
import ConfirmDialog from '@/components/Dialogs/ConfirmDialog.vue'
import Toast from '@/components/Dialogs/Toast.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

const { t } = useI18n()
const presetStore = usePresetStore()
const showEditor = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editingPreset = ref<PresetData>(createDefaultPreset())

const showDeleteConfirm = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'warning' | 'info'>('success')
const pendingDeletePreset = ref<string | null>(null)
const showShareDialog = ref(false)
const shareInputText = ref('')
const shareOutputText = ref('')
const shareError = ref('')

presetStore.loadPresets()

function createNewPreset() {
  editorMode.value = 'create'
  editingPreset.value = normalizePreset(presetStore.currentPreset)
  editingPreset.value.name = t('page.params.presetPanel.newPresetName')
  editingPreset.value.id = ''
  showEditor.value = true
}

function selectPreset(preset: PresetData) {
  presetStore.setCurrentPreset(preset)
}

function editPreset(preset: PresetData) {
  editorMode.value = 'edit'
  editingPreset.value = normalizePreset(preset)
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
}

async function savePreset() {
  try {
    await presetStore.savePreset(editingPreset.value)
    showEditor.value = false
    toastMessage.value = t('page.params.presetSaveSuccess')
    toastType.value = 'success'
    showToast.value = true
  } catch (error) {
    console.error(t('page.params.presetPanel.saveFailed'), error)
    toastMessage.value = t('page.params.presetSaveFailed')
    toastType.value = 'error'
    showToast.value = true
  }
}

function deletePreset(presetId: string) {
  pendingDeletePreset.value = presetId
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (pendingDeletePreset.value) {
    try {
      await presetStore.deletePreset(pendingDeletePreset.value)
      toastMessage.value = t('page.params.presetDeleteSuccess')
      toastType.value = 'success'
      showToast.value = true
    } catch (error) {
      console.error(t('page.params.presetPanel.deleteFailed'), error)
      toastMessage.value = t('page.params.presetDeleteFailed')
      toastType.value = 'error'
      showToast.value = true
    }
  }
  showDeleteConfirm.value = false
  pendingDeletePreset.value = null
}

async function exportPreset(preset: PresetData) {
  try {
    const filePath = await save({
      defaultPath: suggestShareFileName(preset),
      filters: [
        {
          name: 'Preset Share File',
          extensions: ['json'],
        },
      ],
    })

    if (filePath) {
      await presetStore.exportPreset(preset, filePath)
      showToastMessage(t('page.params.presetExportSuccess'), 'success')
    }
  } catch (error) {
    console.error(t('page.params.presetPanel.exportFailed'), error)
    showToastMessage(t('page.params.presetExportFailed'), 'error')
  }
}

async function importPreset() {
  try {
    const filePath = await open({
      filters: [
        {
          name: 'Preset Share File',
          extensions: ['json'],
        },
      ],
    })

    if (filePath && typeof filePath === 'string') {
      await presetStore.importPreset(filePath)
      showToastMessage(t('page.params.presetImportSuccess'), 'success')
    }
  } catch (error) {
    console.error(t('page.params.presetPanel.importFailed'), error)
    const message =
      error instanceof PresetShareError
        ? shareErrorText(error)
        : t('page.params.presetImportFailed')
    showToastMessage(message, 'error')
  }
}

function showToastMessage(message: string, type: 'success' | 'error' | 'warning' | 'info') {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

function shareErrorText(error: unknown): string {
  const code: PresetShareErrorCode = error instanceof PresetShareError ? error.code : 'invalidJson'
  return t(`preset.share.errors.${code}`)
}

function openShareImport() {
  shareInputText.value = ''
  shareOutputText.value = ''
  shareError.value = ''
  showShareDialog.value = true
}

function closeShareDialog() {
  showShareDialog.value = false
  shareError.value = ''
}

async function copyToClipboard(text: string, notify = true) {
  try {
    const clipboard = navigator.clipboard
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      if (notify) showToastMessage(t('preset.share.copyFailed'), 'warning')
      return
    }
    await clipboard.writeText(text)
    if (notify) showToastMessage(t('preset.share.copySuccess'), 'success')
  } catch {
    if (notify) showToastMessage(t('preset.share.copyFailed'), 'warning')
  }
}

async function sharePreset(preset: PresetData) {
  shareInputText.value = ''
  shareError.value = ''
  const result = presetStore.createShareText(preset)
  if (!result.ok) {
    shareOutputText.value = ''
    shareError.value = t(`preset.share.errors.${result.code}`)
    showShareDialog.value = true
    return
  }
  shareOutputText.value = result.text
  showShareDialog.value = true
  await copyToClipboard(result.text, false)
}

async function copyShareOutput() {
  if (shareOutputText.value) {
    await copyToClipboard(shareOutputText.value)
  }
}

async function confirmShareImport() {
  shareError.value = ''
  try {
    await presetStore.importShareText(shareInputText.value)
    showShareDialog.value = false
    showToastMessage(t('preset.share.importSuccess'), 'success')
  } catch (error) {
    shareError.value = shareErrorText(error)
  }
}
</script>

<style scoped>
.preset-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color2, #1e1e1e);
}

.preset-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color1, #333);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preset-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-color1, #e0e0e0);
}

.preset-actions {
  display: flex;
  gap: 0.5rem;
}

.preset-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.preset-item {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  background: var(--bg-color1, #2a2a2a);
  border: 1px solid var(--border-color1, #333);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preset-item:hover {
  border-color: var(--info-color, #3498db);
}

.preset-item.active {
  border-color: var(--info-color, #3498db);
  border-width: 2px;
  background: var(--file-item-active-bg, rgba(52, 152, 219, 0.1));
}

.preset-info {
  flex: 1;
}

.preset-name {
  font-size: 0.95rem;
  color: var(--text-color1, #e0e0e0);
  margin-bottom: 0.25rem;
}

.preset-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-color2, #999);
}

.preset-item-actions {
  display: flex;
  gap: 0.5rem;
}

.preset-item-actions button {
  padding: 0.25rem 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.preset-item-actions button:hover {
  opacity: 1;
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color2, #999);
}

.empty-tip p {
  margin: 0.5rem 0;
}

.preset-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg, rgba(0, 0, 0, 0.7));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preset-editor {
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  background: var(--bg-color1, #2a2a2a);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color1, #333);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header h4 {
  margin: 0;
  color: var(--text-color1, #e0e0e0);
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-color2, #999);
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color2, #1e1e1e);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.9rem;
}

.editor-footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color1, #333);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.share-dialog {
  max-width: 640px;
}

.share-content textarea,
.editor-content textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color2, #1e1e1e);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.82rem;
  resize: vertical;
}

.share-hint {
  display: block;
  margin-top: 0.35rem;
  color: var(--text-color2, #999);
  font-size: 0.78rem;
}

.share-error {
  margin: 0;
  padding: 0.5rem;
  border-radius: 4px;
  color: var(--error-color, #e74c3c);
  font-size: 0.85rem;
}
</style>

<template>
  <div class="preset-manager">
    <div class="preset-header">
      <h3>预设管理</h3>
      <div class="preset-actions">
        <button @click="createNewPreset" class="btn-primary">+ 新建预设</button>
        <button @click="importPreset" class="btn-secondary">导入</button>
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
            <span v-if="preset.video.encoder.codec">{{
              preset.video.encoder.codec
            }}</span>
          </div>
        </div>
        <div class="preset-item-actions">
          <button @click.stop="editPreset(preset)" title="编辑">✏️</button>
          <button @click.stop="exportPreset(preset.id)" title="导出">📤</button>
          <button @click.stop="deletePreset(preset.id)" title="删除">🗑️</button>
        </div>
      </div>

      <div v-if="presetStore.presets.length === 0" class="empty-tip">
        <p>暂无预设</p>
        <small>点击"新建预设"创建您的第一个预设</small>
      </div>
    </div>

    <div v-if="showEditor" class="preset-editor-overlay" @click="closeEditor">
      <div class="preset-editor" @click.stop>
        <div class="editor-header">
          <h4>{{ editorMode === "create" ? "新建预设" : "编辑预设" }}</h4>
          <button @click="closeEditor" class="btn-close">✕</button>
        </div>

        <div class="editor-content">
          <div class="form-group">
            <label>预设名称</label>
            <input
              v-model="editingPreset.name"
              type="text"
              placeholder="输入预设名称"
            />
          </div>

          <div class="form-group">
            <label>输出格式</label>
            <select v-model="editingPreset.output.container">
              <option value="mp4">MP4</option>
              <option value="mkv">MKV</option>
              <option value="webm">WebM</option>
              <option value="avi">AVI</option>
            </select>
          </div>

          <div class="form-group">
            <label>视频编码器</label>
            <select v-model="editingPreset.video.encoder.codec">
              <option value="">复制流</option>
              <option value="libx264">H.264 (libx264)</option>
              <option value="libx265">H.265 (libx265)</option>
              <option value="libvpx-vp9">VP9 (libvpx-vp9)</option>
              <option value="libaom-av1">AV1 (libaom-av1)</option>
            </select>
          </div>

          <div class="form-group" v-if="editingPreset.video.encoder.codec">
            <label>质量 (CRF)</label>
            <input
              v-model="editingPreset.video.bitrateControl.qualityValue"
              type="number"
              min="0"
              max="51"
              placeholder="23"
            />
          </div>

          <div class="form-group">
            <label>音频编码器</label>
            <select v-model="editingPreset.audio.encoder">
              <option value="">复制流</option>
              <option value="aac">AAC</option>
              <option value="libmp3lame">MP3</option>
              <option value="libopus">Opus</option>
              <option value="libvorbis">Vorbis</option>
            </select>
          </div>
        </div>

        <div class="editor-footer">
          <button @click="closeEditor" class="btn-secondary">取消</button>
          <button @click="savePreset" class="btn-primary">保存</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="删除预设"
      message="确定要删除这个预设吗？"
      confirmText="确定"
      cancelText="取消"
      @confirm="confirmDelete"
    />

    <Toast v-model="showToast" :message="toastMessage" :type="toastType" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { usePresetStore } from "@/store/presetStore";
import { DEFAULT_PRESET } from "@/types/preset";
import type { PresetData } from "@/types/preset";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import ConfirmDialog from "@/components/Dialogs/ConfirmDialog.vue";
import Toast from "@/components/Dialogs/Toast.vue";

const { t } = useI18n();
const presetStore = usePresetStore();
const showEditor = ref(false);
const editorMode = ref<"create" | "edit">("create");
const editingPreset = ref<PresetData>({ ...DEFAULT_PRESET });

const showDeleteConfirm = ref(false);
const showToast = ref(false);
const toastMessage = ref("");
const toastType = ref<"success" | "error" | "warning" | "info">("success");
const pendingDeletePreset = ref<string | null>(null);

presetStore.loadPresets();

function createNewPreset() {
  editorMode.value = "create";
  editingPreset.value = { ...presetStore.currentPreset };
  editingPreset.value.name = "新预设";
  editingPreset.value.id = "";
  showEditor.value = true;
}

function selectPreset(preset: PresetData) {
  presetStore.setCurrentPreset(preset);
}

function editPreset(preset: PresetData) {
  editorMode.value = "edit";
  editingPreset.value = { ...preset };
  showEditor.value = true;
}

function closeEditor() {
  showEditor.value = false;
}

async function savePreset() {
  try {
    await presetStore.savePreset(editingPreset.value);
    showEditor.value = false;
    toastMessage.value = t("page.params.presetSaveSuccess");
    toastType.value = "success";
    showToast.value = true;
  } catch (error) {
    console.error("保存预设失败:", error);
    toastMessage.value = t("page.params.presetSaveFailed");
    toastType.value = "error";
    showToast.value = true;
  }
}

function deletePreset(presetId: string) {
  pendingDeletePreset.value = presetId;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (pendingDeletePreset.value) {
    try {
      await presetStore.deletePreset(pendingDeletePreset.value);
      toastMessage.value = t("page.params.presetDeleteSuccess");
      toastType.value = "success";
      showToast.value = true;
    } catch (error) {
      console.error("删除预设失败:", error);
      toastMessage.value = t("page.params.presetDeleteFailed");
      toastType.value = "error";
      showToast.value = true;
    }
  }
  showDeleteConfirm.value = false;
  pendingDeletePreset.value = null;
}

async function exportPreset(presetId: string) {
  try {
    const filePath = await save({
      defaultPath: `preset-${presetId}.json`,
      filters: [
        {
          name: "JSON",
          extensions: ["json"],
        },
      ],
    });

    if (filePath) {
      await presetStore.exportPreset(presetId, filePath);
      toastMessage.value = t("page.params.presetExportSuccess");
      toastType.value = "success";
      showToast.value = true;
    }
  } catch (error) {
    console.error("导出预设失败:", error);
    toastMessage.value = t("page.params.presetExportFailed");
    toastType.value = "error";
    showToast.value = true;
  }
}

async function importPreset() {
  try {
    const filePath = await open({
      filters: [
        {
          name: "JSON",
          extensions: ["json"],
        },
      ],
    });

    if (filePath && typeof filePath === "string") {
      await presetStore.importPreset(filePath);
      toastMessage.value = t("page.params.presetImportSuccess");
      toastType.value = "success";
      showToast.value = true;
    }
  } catch (error) {
    console.error("导入预设失败:", error);
    toastMessage.value = t("page.params.presetImportFailed");
    toastType.value = "error";
    showToast.value = true;
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

.btn-primary {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: var(--info-color, #3498db);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--info-color-dark, #2980b9);
}

.btn-secondary {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color1, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-color3, #3a3a3a);
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
  background: rgba(0, 0, 0, 0.7);
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

.btn-close {
  padding: 0.25rem 0.5rem;
  border: none;
  background: transparent;
  color: var(--text-color1, #e0e0e0);
  cursor: pointer;
  font-size: 1.2rem;
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
</style>

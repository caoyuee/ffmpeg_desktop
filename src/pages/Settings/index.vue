<template>
  <div class="settings-page">
    <div class="settings-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        :class="['settings-tab', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </div>
    </div>

    <div class="settings-content">
      <div v-show="activeTab === 'general'" class="settings-section">
        <h4>{{ t('page.settings.general') }}</h4>
        
        <div class="form-group">
          <label>{{ t('page.settings.language') }}</label>
          <select v-model="settings.language" @change="saveSettings">
            <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
              {{ lang.nativeName }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>{{ t('page.settings.theme') }}</label>
          <select v-model="settings.theme" @change="onThemeChange">
            <option value="dark">{{ t('page.settings.themeDark') }}</option>
            <option value="light">{{ t('page.settings.themeLight') }}</option>
            <option value="system">{{ t('page.settings.themeSystem') }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" class="checkbox-input" v-model="settings.autoCheckUpdate" @change="saveSettings" />
            <span>{{ t('page.settings.autoCheckUpdate') }}</span>
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" class="checkbox-input" v-model="settings.minimizeToTray" @change="saveSettings" />
            <span>{{ t('page.settings.minimizeToTray') }}</span>
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" class="checkbox-input" v-model="settings.closeToTray" @change="saveSettings" />
            <span>{{ t('page.settings.closeToTray') }}</span>
          </label>
        </div>
      </div>

      <div v-show="activeTab === 'ffmpeg'" class="settings-section">
        <h4>{{ t('page.settings.ffmpeg') }}</h4>

        <div class="form-group">
          <label>{{ t('page.settings.ffmpegPath') }}</label>
          <div class="input-row">
            <input type="text" v-model="settings.ffmpegPath" @change="saveSettings" :placeholder="t('common.browse')" />
            <button @click="browseFFmpeg">{{ t('common.browse') }}</button>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('page.settings.ffprobePath') }}</label>
          <div class="input-row">
            <input type="text" v-model="settings.ffprobePath" @change="saveSettings" :placeholder="t('common.browse')" />
            <button @click="browseFFprobe">{{ t('common.browse') }}</button>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('page.settings.maxConcurrentTasks') }}</label>
          <input type="number" v-model.number="settings.maxConcurrentTasks" @change="saveSettings" min="1" max="8" />
        </div>

        <div class="form-group">
          <label>{{ t('page.settings.taskPriority') }}</label>
          <select v-model="settings.taskPriority" @change="saveSettings">
            <option value="low">{{ t('page.settings.priorityLow') }}</option>
            <option value="normal">{{ t('page.settings.priorityNormal') }}</option>
            <option value="high">{{ t('page.settings.priorityHigh') }}</option>
          </select>
        </div>

        <div class="form-group">
          <button class="test-btn" @click="testFFmpeg">{{ t('page.settings.testFFmpeg') }}</button>
          <span v-if="ffmpegTestResult" :class="['test-result', ffmpegTestResult.success ? 'success' : 'error']">
            {{ ffmpegTestResult.message }}
          </span>
        </div>
      </div>

      <div v-show="activeTab === 'output'" class="settings-section">
        <h4>{{ t('page.settings.output') }}</h4>

        <div class="form-group">
          <label>{{ t('page.settings.defaultOutputDir') }}</label>
          <div class="input-row">
            <select v-model="settings.defaultOutputDir" @change="saveSettings">
              <option value="same">{{ t('page.settings.sameAsSource') }}</option>
              <option value="custom">{{ t('page.settings.customDir') }}</option>
            </select>
          </div>
        </div>

        <div v-if="settings.defaultOutputDir === 'custom'" class="form-group">
          <label>{{ t('page.settings.customDir') }}</label>
          <div class="input-row">
            <input type="text" v-model="settings.customOutputDir" @change="saveSettings" />
            <button @click="browseOutputDir">{{ t('common.browse') }}</button>
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.autoOpenOutputFolder" @change="saveSettings" />
            <span>{{ t('page.settings.autoOpenOutputFolder') }}</span>
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.showNotification" @change="saveSettings" />
            <span>{{ t('page.settings.showNotification') }}</span>
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.playSound" @change="saveSettings" />
            <span>{{ t('page.settings.playSound') }}</span>
          </label>
        </div>
      </div>

      <div v-show="activeTab === 'storage'" class="settings-section">
        <h4>{{ t('page.settings.storage') }}</h4>

        <div class="form-group">
          <label>{{ t('page.settings.presetDir') }}</label>
          <div class="input-row">
            <input type="text" v-model="settings.presetDir" @change="saveSettings" />
            <button @click="browsePresetDir">{{ t('common.browse') }}</button>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('page.settings.logRetentionDays') }}</label>
          <input type="number" v-model.number="settings.logRetentionDays" @change="saveSettings" min="0" max="365" />
        </div>

        <div class="form-group">
          <button class="danger-btn" @click="showClearCacheDialog = true">{{ t('page.settings.clearCache') }}</button>
          <button class="danger-btn" @click="showClearLogsDialog = true">{{ t('page.settings.clearLogs') }}</button>
        </div>
      </div>

      <div v-show="activeTab === 'about'" class="settings-section">
        <h4>{{ t('page.settings.about') }}</h4>

        <div class="about-content">
          <div class="app-logo">🎬</div>
          <h3>{{ t('about.softwareName') }}</h3>
          <p class="version">{{ t('about.version') }} 0.1.0</p>
          <p class="description">{{ t('about.description') }}</p>

          <div class="tech-stack">
            <span>Tauri 2.x</span>
            <span>Vue 3</span>
            <span>TypeScript</span>
          </div>

          <div class="links">
            <a href="#" @click.prevent="openGitHub">GitHub</a>
            <a href="#" @click.prevent="openIssues">{{ t('about.issues') }}</a>
            <a href="#" @click.prevent="openReleases">{{ t('about.releases') }}</a>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model="showClearCacheDialog"
      :title="t('page.settings.clearCache')"
      :message="t('page.settings.clearCacheConfirm')"
      :confirmText="t('common.confirm')"
      :cancelText="t('common.cancel')"
      @confirm="clearCache"
    />

    <ConfirmDialog
      v-model="showClearLogsDialog"
      :title="t('page.settings.clearLogs')"
      :message="t('page.settings.clearLogsConfirm')"
      :confirmText="t('common.confirm')"
      :cancelText="t('common.cancel')"
      @confirm="clearLogs"
    />

    <Toast
      v-model="showToast"
      :message="toastMessage"
      :type="toastType"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale, availableLanguages, type LanguageCode } from '@/i18n';
import { useSettingStore, type ThemeMode } from '@/store/settingStore';
import ConfirmDialog from '@/components/Dialogs/ConfirmDialog.vue';
import Toast from '@/components/Dialogs/Toast.vue';

const { t, locale } = useI18n();
const settingStore = useSettingStore();

interface AppSettings {
  language: LanguageCode;
  theme: ThemeMode;
  autoCheckUpdate: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  ffmpegPath: string;
  ffprobePath: string;
  maxConcurrentTasks: number;
  taskPriority: string;
  defaultOutputDir: string;
  customOutputDir: string;
  autoOpenOutputFolder: boolean;
  showNotification: boolean;
  playSound: boolean;
  presetDir: string;
  logRetentionDays: number;
}

const tabs = [
  { id: 'general', label: computed(() => t('page.settings.general')) },
  { id: 'ffmpeg', label: computed(() => t('page.settings.ffmpeg')) },
  { id: 'output', label: computed(() => t('page.settings.output')) },
  { id: 'storage', label: computed(() => t('page.settings.storage')) },
  { id: 'about', label: computed(() => t('page.settings.about')) },
];

const activeTab = ref('general');
const settings = ref<AppSettings>({
  language: 'zh-CN',
  theme: 'system',
  autoCheckUpdate: true,
  minimizeToTray: false,
  closeToTray: false,
  ffmpegPath: '',
  ffprobePath: '',
  maxConcurrentTasks: 2,
  taskPriority: 'normal',
  defaultOutputDir: 'same',
  customOutputDir: '',
  autoOpenOutputFolder: false,
  showNotification: true,
  playSound: false,
  presetDir: '',
  logRetentionDays: 30,
});

const ffmpegTestResult = ref<{ success: boolean; message: string } | null>(null);

const showClearCacheDialog = ref(false);
const showClearLogsDialog = ref(false);
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error' | 'warning' | 'info'>('success');

onMounted(() => {
  loadSettings();
});

watch(() => settings.value.language, (newLang) => {
  setLocale(newLang);
});

function loadSettings() {
  settings.value.theme = settingStore.theme as ThemeMode;
  settings.value.language = settingStore.language as LanguageCode;
  const saved = localStorage.getItem('appSettings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      settings.value = { ...settings.value, ...parsed };
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }
}

function saveSettings() {
  localStorage.setItem('appSettings', JSON.stringify(settings.value));
}

function onThemeChange() {
  settingStore.updateTheme(settings.value.theme);
  saveSettings();
}

async function browseFFmpeg() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: false,
    filters: [{ name: '可执行文件', extensions: ['exe', ''] }],
  });
  if (selected && typeof selected === 'string') {
    settings.value.ffmpegPath = selected;
    saveSettings();
  }
}

async function browseFFprobe() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: false,
    filters: [{ name: '可执行文件', extensions: ['exe', ''] }],
  });
  if (selected && typeof selected === 'string') {
    settings.value.ffprobePath = selected;
    saveSettings();
  }
}

async function browseOutputDir() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({ directory: true });
  if (selected && typeof selected === 'string') {
    settings.value.customOutputDir = selected;
    saveSettings();
  }
}

async function browsePresetDir() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({ directory: true });
  if (selected && typeof selected === 'string') {
    settings.value.presetDir = selected;
    saveSettings();
  }
}

async function testFFmpeg() {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<string>('test_ffmpeg', { 
      path: settings.value.ffmpegPath || '' 
    });
    ffmpegTestResult.value = { success: true, message: result || 'FFmpeg 可用' };
  } catch (error) {
    ffmpegTestResult.value = { success: false, message: '未找到 FFmpeg: ' + String(error) };
  }
}

function clearCache() {
  localStorage.removeItem('presetCache');
  toastMessage.value = t('message.cacheCleared');
  toastType.value = 'success';
  showToast.value = true;
}

function clearLogs() {
  localStorage.removeItem('taskLogs');
  toastMessage.value = t('message.logsCleared');
  toastType.value = 'success';
  showToast.value = true;
}

function openGitHub() {
  window.open('https://github.com', '_blank');
}

function openIssues() {
  window.open('https://github.com/issues', '_blank');
}

function openReleases() {
  window.open('https://github.com/releases', '_blank');
}
</script>

<style scoped>
.settings-page {
  display: flex;
  height: 100%;
  background: var(--bg-color1, #181818);
}

.settings-tabs {
  width: 180px;
  background: var(--bg-color2, #242424);
  border-right: 1px solid var(--border-color1, #333);
  padding: 16px 8px;
}

.settings-tab {
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-color2, #808080);
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 4px;
}

.settings-tab:hover {
  background: var(--hover-bg, #303030);
  color: var(--text-color1, #c0c0c0);
}

.settings-tab.active {
  background: var(--active-bg, #404040);
  color: var(--active-color, #9acd32);
}

.settings-content {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

.settings-section {
  max-width: 600px;
}

.settings-section h4 {
  margin: 0 0 20px;
  font-size: 16px;
  color: var(--text-color1, #c0c0c0);
  border-bottom: 1px solid var(--border-color1, #333);
  padding-bottom: 12px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-color2, #808080);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-color2, #242424);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  box-sizing: border-box;
}

.form-group small {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-color2, #606060);
}

.input-row {
  display: flex;
  gap: 8px;
}

.input-row input {
  flex: 1;
}

.input-row button {
  padding: 10px 16px;
  background: var(--bg-color3, #303030);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  cursor: pointer;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color1, #c0c0c0);
}

.checkbox-label .checkbox-input {
  width: 10px;
  height: 10px;
}

.test-btn {
  padding: 10px 20px;
  background: var(--info-color, #3498db);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.test-result {
  margin-left: 12px;
  font-size: 13px;
}

.test-result.success {
  color: var(--success-color, #27ae60);
}

.test-result.error {
  color: var(--error-color, #e74c3c);
}

.danger-btn {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid var(--error-color, #e74c3c);
  border-radius: 4px;
  color: var(--error-color, #e74c3c);
  cursor: pointer;
  margin-right: 12px;
}

.danger-btn:hover {
  background: var(--error-color, #e74c3c);
  color: white;
}

.about-content {
  text-align: center;
  padding: 40px 0;
}

.app-logo {
  font-size: 64px;
  margin-bottom: 16px;
}

.about-content h3 {
  margin: 0;
  font-size: 24px;
  color: var(--text-color1, #c0c0c0);
}

.version {
  margin: 8px 0;
  font-size: 14px;
  color: var(--text-color2, #808080);
}

.description {
  margin: 16px 0;
  font-size: 14px;
  color: var(--text-color2, #909090);
}

.tech-stack {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 24px 0;
}

.tech-stack span {
  padding: 6px 12px;
  background: var(--bg-color2, #242424);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-color2, #909090);
}

.links {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.links a {
  font-size: 14px;
  color: var(--info-color, #3498db);
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}
</style>

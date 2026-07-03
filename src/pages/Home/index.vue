<template>
  <div class="home-page">
    <div class="welcome-section">
      <div class="logo-area">
        <div class="logo">
          <img src="@/assets/app-icon.png" :alt="t('page.home.title')" />
        </div>
        <h1>{{ t('page.home.title') }}</h1>
        <p class="subtitle">{{ t('page.home.subtitle') }}</p>
      </div>

      <div class="quick-actions">
        <h3>{{ t('page.home.quickStart') }}</h3>
        <div class="action-grid">
          <div class="action-card" @click="goToQueue">
            <AppIcon name="queue" class="icon" :size="32" />
            <span class="title">{{ t('page.home.encodingQueue') }}</span>
            <span class="desc">{{ t('page.home.encodingQueueDesc') }}</span>
          </div>
          <div class="action-card" @click="goToParams">
            <AppIcon name="params" class="icon" :size="32" />
            <span class="title">{{ t('page.home.paramSettings') }}</span>
            <span class="desc">{{ t('page.home.paramSettingsDesc') }}</span>
          </div>
          <div class="action-card" @click="goToMediaInfo">
            <AppIcon name="mediainfo" class="icon" :size="32" />
            <span class="title">{{ t('page.home.mediaInfo') }}</span>
            <span class="desc">{{ t('page.home.mediaInfoDesc') }}</span>
          </div>
          <div class="action-card" @click="goToSettings">
            <AppIcon name="settings" class="icon" :size="32" />
            <span class="title">{{ t('page.home.softwareSettings') }}</span>
            <span class="desc">{{ t('page.home.softwareSettingsDesc') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="info-section">
      <div class="info-card">
        <h4>{{ t('page.home.instructions') }}</h4>
        <ol>
          <li>{{ t('page.home.step1') }}</li>
          <li>{{ t('page.home.step2') }}</li>
          <li>{{ t('page.home.step3') }}</li>
          <li>{{ t('page.home.step4') }}</li>
        </ol>
      </div>

      <div class="info-card">
        <h4>{{ t('page.home.shortcuts') }}</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <kbd>Enter</kbd>
            <span>{{ t('page.home.startTask') }}</span>
          </div>
          <div class="shortcut-item">
            <kbd>Space</kbd>
            <span>{{ t('page.home.pauseTask') }}</span>
          </div>
          <div class="shortcut-item">
            <kbd>Delete</kbd>
            <span>{{ t('page.home.removeTask') }}</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl+A</kbd>
            <span>{{ t('page.home.selectAll') }}</span>
          </div>
        </div>
      </div>

      <div class="info-card links">
        <h4>{{ t('page.home.relatedLinks') }}</h4>
        <div class="link-list">
          <a href="#" @click.prevent="openFFmpegDocs">{{ t('page.home.ffmpegDocs') }}</a>
          <a href="#" @click.prevent="openFFmpegDownload">{{ t('page.home.downloadFFmpeg') }}</a>
          <a href="#" @click.prevent="openGitHub">{{ t('page.home.githubRepo') }}</a>
        </div>
      </div>
    </div>

    <div class="version-info">
      <span>{{ t('page.home.version') }}: 0.1.0</span>
      <span>|</span>
      <span>Tauri 2.x + Vue 3</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppIcon from '@/components/AppIcon/AppIcon.vue';

const router = useRouter();
const { t } = useI18n();

function goToQueue() {
  router.push('/queue');
}

function goToParams() {
  router.push('/params');
}

function goToMediaInfo() {
  router.push('/mediainfo');
}

function goToSettings() {
  router.push('/settings');
}

function openFFmpegDocs() {
  window.open('https://ffmpeg.org/documentation.html', '_blank');
}

function openFFmpegDownload() {
  window.open('https://ffmpeg.org/download.html', '_blank');
}

function openGitHub() {
  window.open('https://github.com', '_blank');
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  padding: 28px;
  gap: 20px;
  max-width: 1120px;
  margin: 0 auto;
}

.welcome-section {
  display: grid;
  grid-template-columns: minmax(260px, 0.9fr) minmax(420px, 1.4fr);
  gap: 20px;
  align-items: stretch;
}

.logo-area {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  min-height: 260px;
  padding: 28px;
  background: var(--bg-color2, #242424);
  border: 1px solid var(--border-color1, #333);
  border-radius: 8px;
}

.logo {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-start;
}

.logo img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.logo-area h1 {
  margin: 0;
  font-size: 30px;
  color: var(--text-color1, #c0c0c0);
}

.subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--text-color2, #808080);
}

.quick-actions h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: var(--text-color1, #c0c0c0);
}

.quick-actions {
  padding: 20px;
  background: var(--bg-color2, #242424);
  border: 1px solid var(--border-color1, #333);
  border-radius: 8px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 116px;
  padding: 16px;
  background: var(--bg-color1, #181818);
  border: 1px solid var(--border-color1, #333);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:hover {
  background: var(--hover-bg, #303030);
  border-color: var(--active-color, #9acd32);
}

.action-card .icon {
  margin-bottom: 12px;
  color: var(--info-color, #3498db);
  display: inline-flex;
}

.action-card .title {
  font-size: 14px;
  color: var(--text-color1, #c0c0c0);
  margin-bottom: 4px;
}

.action-card .desc {
  font-size: 12px;
  color: var(--text-color2, #808080);
  line-height: 1.5;
}

.info-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.info-card {
  background: var(--bg-color2, #242424);
  border: 1px solid var(--border-color1, #333);
  border-radius: 8px;
  padding: 16px;
}

.info-card h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--text-color1, #c0c0c0);
  border-bottom: 1px solid var(--border-color1, #333);
  padding-bottom: 8px;
}

.info-card ol {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--text-color2, #909090);
  line-height: 1.8;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.shortcut-item kbd {
  padding: 4px 8px;
  background: var(--bg-color1, #181818);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  color: var(--text-color1, #c0c0c0);
}

.shortcut-item span {
  color: var(--text-color2, #909090);
}

.link-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-list a {
  font-size: 12px;
  color: var(--info-color, #3498db);
  text-decoration: none;
}

.link-list a:hover {
  text-decoration: underline;
}

.version-info {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  font-size: 12px;
  color: var(--text-color2, #606060);
}

@media (max-width: 900px) {
  .welcome-section,
  .info-section {
    grid-template-columns: 1fr;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>

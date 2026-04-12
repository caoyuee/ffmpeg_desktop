<template>
  <div class="home-page">
    <div class="welcome-section">
      <div class="logo-area">
        <div class="logo">🎬</div>
        <h1>FFmpeg Desktop</h1>
        <p class="subtitle">基于 Tauri 2.x 的 FFmpeg 图形化界面</p>
      </div>

      <div class="quick-actions">
        <h3>快速开始</h3>
        <div class="action-grid">
          <div class="action-card" @click="goToQueue">
            <span class="icon">📋</span>
            <span class="title">编码队列</span>
            <span class="desc">添加文件并开始转换</span>
          </div>
          <div class="action-card" @click="goToParams">
            <span class="icon">⚙️</span>
            <span class="title">参数设置</span>
            <span class="desc">配置编码参数</span>
          </div>
          <div class="action-card" @click="goToMediaInfo">
            <span class="icon">ℹ️</span>
            <span class="title">媒体信息</span>
            <span class="desc">查看文件详细信息</span>
          </div>
          <div class="action-card" @click="goToSettings">
            <span class="icon">🔧</span>
            <span class="title">软件设置</span>
            <span class="desc">配置软件选项</span>
          </div>
        </div>
      </div>
    </div>

    <div class="info-section">
      <div class="info-card">
        <h4>使用说明</h4>
        <ol>
          <li>将 FFmpeg 可执行文件放入程序目录或添加到系统环境变量</li>
          <li>在编码队列页面添加要转换的视频文件</li>
          <li>在参数面板设置编码参数</li>
          <li>点击开始按钮开始转换</li>
        </ol>
      </div>

      <div class="info-card">
        <h4>快捷键</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <kbd>Enter</kbd>
            <span>开始任务</span>
          </div>
          <div class="shortcut-item">
            <kbd>Space</kbd>
            <span>暂停任务</span>
          </div>
          <div class="shortcut-item">
            <kbd>Delete</kbd>
            <span>移除任务</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl+A</kbd>
            <span>全选任务</span>
          </div>
        </div>
      </div>

      <div class="info-card links">
        <h4>相关链接</h4>
        <div class="link-list">
          <a href="#" @click.prevent="openFFmpegDocs">FFmpeg 官方文档</a>
          <a href="#" @click.prevent="openFFmpegDownload">下载 FFmpeg</a>
          <a href="#" @click.prevent="openGitHub">GitHub 仓库</a>
        </div>
      </div>
    </div>

    <div class="version-info">
      <span>版本: 0.1.0</span>
      <span>|</span>
      <span>Tauri 2.x + Vue 3</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

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
  padding: 40px;
  gap: 32px;
  max-width: 900px;
  margin: 0 auto;
}

.welcome-section {
  text-align: center;
}

.logo-area {
  margin-bottom: 32px;
}

.logo {
  font-size: 64px;
  margin-bottom: 16px;
}

.logo-area h1 {
  margin: 0;
  font-size: 28px;
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

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  background: var(--bg-color2, #242424);
  border: 1px solid var(--border-color1, #333);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:hover {
  background: var(--hover-bg, #303030);
  border-color: var(--active-color, #9acd32);
}

.action-card .icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.action-card .title {
  font-size: 14px;
  color: var(--text-color1, #c0c0c0);
  margin-bottom: 4px;
}

.action-card .desc {
  font-size: 12px;
  color: var(--text-color2, #808080);
}

.info-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.info-card {
  background: var(--bg-color2, #242424);
  border-radius: 8px;
  padding: 20px;
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
  justify-content: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-color2, #606060);
}
</style>

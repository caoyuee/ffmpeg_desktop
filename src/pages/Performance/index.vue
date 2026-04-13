<template>
  <div class="performance-page">
    <div class="toolbar">
      <button class="btn btn-refresh" @click="refreshInterval > 0 ? stopMonitoring() : startMonitoring()">
        <span class="icon">{{ refreshInterval > 0 ? '⏹️' : '▶️' }}</span>
        {{ refreshInterval > 0 ? t('page.performance.stopMonitor') : t('page.performance.startMonitor') }}
      </button>
      <span class="refresh-rate">
        {{ t('page.performance.refreshRate') }}:
        <select v-model="refreshRate" @change="updateRefreshRate" :disabled="refreshInterval > 0">
          <option :value="500">500ms</option>
          <option :value="1000">1s</option>
          <option :value="2000">2s</option>
          <option :value="5000">5s</option>
        </select>
      </span>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-card cpu">
        <div class="metric-header">
          <span class="metric-icon">💻</span>
          <span class="metric-title">{{ t('page.performance.cpu') }}</span>
        </div>
        <div class="metric-value">
          <span class="value">{{ metrics.cpu.usage.toFixed(1) }}</span>
          <span class="unit">%</span>
        </div>
        <div class="metric-bar">
          <div class="bar-fill" :style="{ width: metrics.cpu.usage + '%' }"></div>
        </div>
        <div class="metric-details">
          <div class="detail-row">
            <span>{{ t('page.performance.cores') }}</span>
            <span>{{ metrics.cpu.cores }}</span>
          </div>
          <div class="detail-row">
            <span>{{ t('page.performance.temperature') }}</span>
            <span>{{ metrics.cpu.temperature ? metrics.cpu.temperature.toFixed(0) + '°C' : 'N/A' }}</span>
          </div>
        </div>
      </div>
      
      <div class="metric-card memory">
        <div class="metric-header">
          <span class="metric-icon">🧠</span>
          <span class="metric-title">{{ t('page.performance.memory') }}</span>
        </div>
        <div class="metric-value">
          <span class="value">{{ metrics.memory.usedPercent.toFixed(1) }}</span>
          <span class="unit">%</span>
        </div>
        <div class="metric-bar">
          <div class="bar-fill" :style="{ width: metrics.memory.usedPercent + '%' }"></div>
        </div>
        <div class="metric-details">
          <div class="detail-row">
            <span>{{ t('page.performance.used') }}</span>
            <span>{{ formatBytes(metrics.memory.used) }}</span>
          </div>
          <div class="detail-row">
            <span>{{ t('page.performance.total') }}</span>
            <span>{{ formatBytes(metrics.memory.total) }}</span>
          </div>
        </div>
      </div>
      
      <div class="metric-card gpu">
        <div class="metric-header">
          <span class="metric-icon">🎮</span>
          <span class="metric-title">{{ t('page.performance.gpu') }}</span>
        </div>
        <div class="metric-value">
          <span class="value">{{ metrics.gpu.usage.toFixed(1) }}</span>
          <span class="unit">%</span>
        </div>
        <div class="metric-bar">
          <div class="bar-fill" :style="{ width: metrics.gpu.usage + '%' }"></div>
        </div>
        <div class="metric-details">
          <div class="detail-row">
            <span>{{ t('page.performance.vram') }}</span>
            <span>{{ formatBytes(metrics.gpu.memoryUsed) }} / {{ formatBytes(metrics.gpu.memoryTotal) }}</span>
          </div>
          <div class="detail-row">
            <span>{{ t('page.performance.temperature') }}</span>
            <span>{{ metrics.gpu.temperature ? metrics.gpu.temperature.toFixed(0) + '°C' : 'N/A' }}</span>
          </div>
        </div>
      </div>
      
      <div class="metric-card disk">
        <div class="metric-header">
          <span class="metric-icon">💾</span>
          <span class="metric-title">{{ t('page.performance.disk') }}</span>
        </div>
        <div class="metric-value">
          <span class="value">{{ metrics.disk.readSpeed.toFixed(0) }}</span>
          <span class="unit">MB/s</span>
        </div>
        <div class="metric-bar">
          <div class="bar-fill" :style="{ width: Math.min(metrics.disk.readSpeed / 10, 100) + '%' }"></div>
        </div>
        <div class="metric-details">
          <div class="detail-row">
            <span>{{ t('page.performance.readSpeed') }}</span>
            <span>{{ metrics.disk.readSpeed.toFixed(1) }} MB/s</span>
          </div>
          <div class="detail-row">
            <span>{{ t('page.performance.writeSpeed') }}</span>
            <span>{{ metrics.disk.writeSpeed.toFixed(1) }} MB/s</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="process-section">
      <div class="section-header">
        <span class="section-title">{{ t('page.performance.processes') }}</span>
      </div>
      <div class="process-list">
        <div v-if="ffmpegProcesses.length === 0" class="no-process">
          {{ t('page.performance.noProcess') }}
        </div>
        <div v-for="proc in ffmpegProcesses" :key="proc.pid" class="process-item">
          <div class="process-info">
            <span class="process-name">ffmpeg (PID: {{ proc.pid }})</span>
            <span class="process-cpu">CPU: {{ proc.cpu.toFixed(1) }}%</span>
            <span class="process-memory">{{ t('page.performance.memory') }}: {{ formatBytes(proc.memory) }}</span>
          </div>
          <button class="btn btn-kill" @click="killProcess(proc.pid)">{{ t('page.performance.terminate') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';

const { t } = useI18n();

interface CpuMetrics {
  usage: number;
  cores: number;
  temperature: number | null;
}

interface MemoryMetrics {
  total: number;
  used: number;
  usedPercent: number;
}

interface GpuMetrics {
  usage: number;
  memoryTotal: number;
  memoryUsed: number;
  temperature: number | null;
}

interface DiskMetrics {
  readSpeed: number;
  writeSpeed: number;
}

interface ProcessInfo {
  pid: number;
  cpu: number;
  memory: number;
}

interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  gpu: GpuMetrics;
  disk: DiskMetrics;
}

const metrics = ref<SystemMetrics>({
  cpu: { usage: 0, cores: 0, temperature: null },
  memory: { total: 0, used: 0, usedPercent: 0 },
  gpu: { usage: 0, memoryTotal: 0, memoryUsed: 0, temperature: null },
  disk: { readSpeed: 0, writeSpeed: 0 },
});

const ffmpegProcesses = ref<ProcessInfo[]>([]);
const refreshRate = ref(1000);
const refreshInterval = ref(0);

async function fetchMetrics() {
  try {
    const data = await invoke<SystemMetrics>('get_system_metrics');
    metrics.value = data;
    
    const processes = await invoke<ProcessInfo[]>('get_ffmpeg_processes');
    ffmpegProcesses.value = processes;
  } catch (error) {
    console.error('获取系统指标失败:', error);
  }
}

function startMonitoring() {
  fetchMetrics();
  refreshInterval.value = window.setInterval(fetchMetrics, refreshRate.value);
}

function stopMonitoring() {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = 0;
  }
}

function updateRefreshRate() {
  if (refreshInterval.value > 0) {
    stopMonitoring();
    startMonitoring();
  }
}

async function killProcess(pid: number) {
  try {
    await invoke('kill_process', { pid });
    await fetchMetrics();
  } catch (error) {
    console.error('终止进程失败:', error);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

onMounted(() => {
  startMonitoring();
});

onUnmounted(() => {
  stopMonitoring();
});
</script>

<style scoped>
.performance-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color2, #181818);
  padding: 10px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
  margin-bottom: 10px;
}

.btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-refresh {
  background: var(--bg-color4, #383838);
  color: #9acd32;
}

.btn-kill {
  background: var(--bg-color4, #383838);
  color: #cd5c5c;
  padding: 4px 12px;
}

.refresh-rate {
  color: #888;
  font-size: 13px;
}

.refresh-rate select {
  margin-left: 8px;
  padding: 4px 8px;
  background: var(--bg-color4, #303030);
  border: none;
  border-radius: 4px;
  color: #c0c0c0;
  cursor: pointer;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.metric-card {
  background: var(--bg-color3, #242424);
  border-radius: 4px;
  padding: 15px;
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.metric-icon {
  font-size: 20px;
}

.metric-title {
  color: #c0c0c0;
  font-size: 14px;
  font-weight: 500;
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 10px;
}

.metric-value .value {
  color: #9acd32;
  font-size: 28px;
  font-weight: bold;
}

.metric-value .unit {
  color: #888;
  font-size: 14px;
}

.metric-bar {
  height: 6px;
  background: var(--bg-color1, #181818);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 15px;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #9acd32, #6495ed);
  border-radius: 3px;
  transition: width 0.3s;
}

.metric-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  color: #888;
  font-size: 12px;
}

.process-section {
  flex: 1;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.section-header {
  padding: 10px 15px;
  border-bottom: 1px solid var(--bg-color4, #383838);
}

.section-title {
  color: #c0c0c0;
  font-size: 14px;
  font-weight: 500;
}

.process-list {
  flex: 1;
  overflow: auto;
  padding: 10px;
}

.no-process {
  color: #555;
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

.process-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background: var(--bg-color4, #383838);
  border-radius: 4px;
  margin-bottom: 8px;
}

.process-info {
  display: flex;
  gap: 20px;
}

.process-name {
  color: #c0c0c0;
  font-size: 13px;
}

.process-cpu,
.process-memory {
  color: #888;
  font-size: 12px;
}
</style>

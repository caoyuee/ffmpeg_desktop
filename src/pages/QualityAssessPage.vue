<template>
  <div class="quality-assess-page">
    <div class="page-header">
      <span class="header-text">视频画质评测工具 - 支持 VMAF/SSIM/PSNR 等指标</span>
    </div>
    
    <div class="toolbar">
      <button class="btn btn-add" @click="selectReference">
        <span class="icon">📁</span> 选择参考视频
      </button>
      <button class="btn btn-add" @click="selectDistorted">
        <span class="icon">📁</span> 选择待测视频
      </button>
      <button class="btn btn-clear" @click="clearAll">
        <span class="icon">🗑️</span> 清空
      </button>
    </div>
    
    <div class="files-section">
      <div class="file-row">
        <label class="file-label">参考视频（原始）</label>
        <input type="text" class="file-input" v-model="referenceFile" placeholder="选择原始/无损视频作为参考" readonly />
      </div>
      <div class="file-row">
        <label class="file-label">待测视频（压缩后）</label>
        <input type="text" class="file-input" v-model="distortedFile" placeholder="选择需要评估画质的视频" readonly />
      </div>
    </div>
    
    <div class="options-section">
      <div class="option-row">
        <label class="option-label">评测指标</label>
        <div class="option-content">
          <label class="checkbox-label">
            <input type="checkbox" v-model="metrics.vmaf" />
            VMAF
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="metrics.ssim" />
            SSIM
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="metrics.psnr" />
            PSNR
          </label>
        </div>
      </div>
      
      <div class="option-row">
        <label class="option-label">VMAF 模型</label>
        <div class="option-content">
          <select class="select-input" v-model="vmafModel">
            <option value="model_vmaf_v0.6.1">默认模型 (v0.6.1)</option>
            <option value="model_vmaf_4k_v0.6.1">4K 模型</option>
            <option value="model_vmaf_v0.6.1neg">负向模型</option>
          </select>
        </div>
      </div>
      
      <div class="option-row">
        <label class="option-label">输出报告</label>
        <div class="option-content">
          <select class="select-input" v-model="outputFormat">
            <option value="json">JSON</option>
            <option value="xml">XML</option>
            <option value="csv">CSV</option>
          </select>
          <button class="btn btn-browse" @click="selectOutputPath">
            <span class="icon">📂</span> 选择保存位置
          </button>
          <input type="text" class="file-input small" v-model="outputPath" placeholder="报告保存路径" />
        </div>
      </div>
    </div>
    
    <div class="action-bar">
      <button class="btn btn-start" @click="startAssessment" :disabled="!canStart">
        <span class="icon">▶️</span> 开始评测
      </button>
      <button class="btn btn-stop" @click="stopAssessment" :disabled="!isRunning">
        <span class="icon">⏹️</span> 停止
      </button>
    </div>
    
    <div class="progress-section" v-if="isRunning">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <span class="progress-text">{{ progress.toFixed(1) }}%</span>
      <span class="status-text">{{ statusText }}</span>
    </div>
    
    <div class="results-section" v-if="results">
      <div class="results-header">
        <span class="results-title">评测结果</span>
      </div>
      <div class="results-grid">
        <div class="result-card" v-if="results.vmaf">
          <span class="result-label">VMAF</span>
          <span class="result-value">{{ results.vmaf.mean?.toFixed(2) || 'N/A' }}</span>
          <span class="result-hint">均值</span>
          <span class="result-minmax">最小: {{ results.vmaf.min?.toFixed(2) }} | 最大: {{ results.vmaf.max?.toFixed(2) }}</span>
        </div>
        <div class="result-card" v-if="results.ssim">
          <span class="result-label">SSIM</span>
          <span class="result-value">{{ results.ssim.mean?.toFixed(4) || 'N/A' }}</span>
          <span class="result-hint">均值</span>
          <span class="result-minmax">范围: 0-1 (1=完全相同)</span>
        </div>
        <div class="result-card" v-if="results.psnr">
          <span class="result-label">PSNR</span>
          <span class="result-value">{{ results.psnr.mean?.toFixed(2) || 'N/A' }} dB</span>
          <span class="result-hint">均值</span>
          <span class="result-minmax">范围: 0-∞ (越高越好)</span>
        </div>
      </div>
    </div>
    
    <div class="log-section">
      <div class="log-header">
        <span>日志输出</span>
      </div>
      <div class="log-content" ref="logContent">
        <div v-for="(line, index) in logLines" :key="index" class="log-line">{{ line }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const referenceFile = ref('');
const distortedFile = ref('');
const outputPath = ref('');
const outputFormat = ref('json');
const vmafModel = ref('model_vmaf_v0.6.1');
const metrics = ref({
  vmaf: true,
  ssim: false,
  psnr: false,
});

const isRunning = ref(false);
const progress = ref(0);
const statusText = ref('');
const logLines = ref<string[]>([]);
const logContent = ref<HTMLDivElement | null>(null);

const results = ref<{
  vmaf?: { mean: number; min: number; max: number };
  ssim?: { mean: number };
  psnr?: { mean: number };
} | null>(null);

const canStart = computed(() => {
  return referenceFile.value && distortedFile.value && (metrics.value.vmaf || metrics.value.ssim || metrics.value.psnr);
});

async function selectReference() {
  const file = await open({
    multiple: false,
    filters: [{ name: '视频文件', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', '*'] }],
  });
  if (file) {
    referenceFile.value = file as string;
  }
}

async function selectDistorted() {
  const file = await open({
    multiple: false,
    filters: [{ name: '视频文件', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', '*'] }],
  });
  if (file) {
    distortedFile.value = file as string;
  }
}

async function selectOutputPath() {
  const path = await save({
    filters: [{ name: '报告文件', extensions: [outputFormat.value] }],
  });
  if (path) {
    outputPath.value = path;
  }
}

function clearAll() {
  referenceFile.value = '';
  distortedFile.value = '';
  outputPath.value = '';
  results.value = null;
  logLines.value = [];
  progress.value = 0;
}

function addLog(line: string) {
  logLines.value.push(`[${new Date().toLocaleTimeString()}] ${line}`);
  if (logContent.value) {
    logContent.value.scrollTop = logContent.value.scrollHeight;
  }
}

async function startAssessment() {
  if (!canStart.value) return;
  
  isRunning.value = true;
  progress.value = 0;
  results.value = null;
  logLines.value = [];
  
  addLog('开始画质评测...');
  addLog(`参考视频: ${referenceFile.value}`);
  addLog(`待测视频: ${distortedFile.value}`);
  
  try {
    const filterParts: string[] = [];
    
    if (metrics.value.vmaf) {
      filterParts.push(`libvmaf=model_path=${vmafModel.value}.json`);
    }
    if (metrics.value.ssim) {
      filterParts.push('ssim');
    }
    if (metrics.value.psnr) {
      filterParts.push('psnr');
    }
    
    const filterComplex = `[0:v][1:v]${filterParts.join(',')}`;
    
    let command = `-hide_banner -i "${referenceFile.value}" -i "${distortedFile.value}" -lavfi "${filterComplex}" -f null -`;
    
    if (outputPath.value) {
      command += ` -stats_file "${outputPath.value}"`;
    }
    
    addLog(`执行命令: ffmpeg ${command}`);
    
    await invoke('start_quality_assessment', {
      referencePath: referenceFile.value,
      distortedPath: distortedFile.value,
      metrics: Object.entries(metrics.value).filter(([_, v]) => v).map(([k]) => k),
      vmafModel: vmafModel.value,
      outputPath: outputPath.value,
    });
    
    listen('quality-assessment-progress', (event) => {
      const data = event.payload as { progress: number; status: string };
      progress.value = data.progress;
      statusText.value = data.status;
    });
    
    listen('quality-assessment-log', (event) => {
      addLog(event.payload as string);
    });
    
    listen('quality-assessment-complete', (event) => {
      const data = event.payload as typeof results.value;
      results.value = data;
      isRunning.value = false;
      progress.value = 100;
      addLog('评测完成！');
    });
    
  } catch (error) {
    addLog(`错误: ${error}`);
    isRunning.value = false;
  }
}

async function stopAssessment() {
  try {
    await invoke('stop_quality_assessment');
    addLog('已停止评测');
  } catch (error) {
    addLog(`停止失败: ${error}`);
  }
  isRunning.value = false;
}
</script>

<style scoped>
.quality-assess-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color2, #181818);
  padding: 10px;
  gap: 10px;
}

.page-header {
  padding: 10px;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
}

.header-text {
  color: #888;
  font-size: 13px;
}

.toolbar {
  display: flex;
  gap: 8px;
  padding: 10px;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-add {
  background: var(--bg-color4, #383838);
  color: #9acd32;
}

.btn-clear {
  background: var(--bg-color4, #383838);
  color: #cd5c5c;
}

.btn-browse {
  background: var(--bg-color4, #383838);
  color: #6495ed;
  padding: 4px 12px;
}

.btn-start {
  background: var(--bg-color4, #383838);
  color: #9acd32;
}

.btn-stop {
  background: var(--bg-color4, #383838);
  color: #cd5c5c;
}

.files-section {
  background: var(--bg-color3, #242424);
  border-radius: 4px;
  padding: 10px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.file-row:last-child {
  margin-bottom: 0;
}

.file-label {
  color: #888;
  font-size: 13px;
  min-width: 120px;
}

.file-input {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-color1, #181818);
  border: none;
  border-radius: 15px;
  color: #c0c0c0;
  font-size: 13px;
  outline: none;
}

.file-input.small {
  max-width: 200px;
}

.options-section {
  background: var(--bg-color3, #242424);
  border-radius: 4px;
  padding: 10px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.option-row:last-child {
  margin-bottom: 0;
}

.option-label {
  color: #888;
  font-size: 13px;
  min-width: 100px;
}

.option-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #c0c0c0;
  font-size: 13px;
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.select-input {
  padding: 6px 12px;
  background: var(--bg-color4, #303030);
  border: none;
  border-radius: 4px;
  color: #c0c0c0;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.action-bar {
  display: flex;
  gap: 10px;
  padding: 10px;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-color1, #181818);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #9acd32, #6495ed);
  transition: width 0.3s;
}

.progress-text {
  color: #9acd32;
  font-size: 13px;
  min-width: 50px;
}

.status-text {
  color: #888;
  font-size: 12px;
}

.results-section {
  background: var(--bg-color3, #242424);
  border-radius: 4px;
  padding: 10px;
}

.results-header {
  margin-bottom: 10px;
}

.results-title {
  color: #c0c0c0;
  font-size: 14px;
  font-weight: 500;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.result-card {
  background: var(--bg-color4, #383838);
  border-radius: 4px;
  padding: 15px;
  text-align: center;
}

.result-label {
  display: block;
  color: #888;
  font-size: 12px;
  margin-bottom: 5px;
}

.result-value {
  display: block;
  color: #9acd32;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.result-hint {
  display: block;
  color: #666;
  font-size: 11px;
}

.result-minmax {
  display: block;
  color: #555;
  font-size: 10px;
  margin-top: 5px;
}

.log-section {
  flex: 1;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  min-height: 100px;
}

.log-header {
  padding: 8px 10px;
  border-bottom: 1px solid var(--bg-color4, #383838);
  color: #888;
  font-size: 12px;
}

.log-content {
  flex: 1;
  overflow: auto;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
}

.log-line {
  color: #888;
  line-height: 1.6;
}
</style>

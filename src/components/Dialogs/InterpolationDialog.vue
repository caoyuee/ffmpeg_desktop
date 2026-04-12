<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="close">
      <div class="dialog-container">
        <div class="dialog-header">
          <span class="dialog-title">minterpolate 插帧</span>
        </div>
        
        <div class="dialog-content">
          <div class="info-text">
            <p>minterpolate 效果非常一般但是足够快且质量稳定；另外抽帧也是用的这个滤镜</p>
            <p>考虑使用 AI 软件：SVP、SVFI、Topaz Video AI</p>
          </div>
          
          <div class="form-row">
            <label class="row-label">目标帧率</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input" 
                v-model="settings.targetFps"
                placeholder="要补到多少帧"
              />
              <span class="hint">目标帧率 或 插帧模式 留空以取消使用此滤镜</span>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">算法模式</label>
            <div class="row-content">
              <select class="select-input" v-model="settings.interpolationMode">
                <option value="">插帧模式</option>
                <option value="2">两帧加权平均</option>
                <option value="mci">运动补偿插值</option>
              </select>
              <select class="select-input" v-model="settings.meMode">
                <option value="">运动估计模式</option>
                <option value="bidir">双向运动估计</option>
                <option value="bilat">双侧运动估计</option>
              </select>
              <select class="select-input" v-model="settings.meAlgorithm">
                <option value="">运动估计算法</option>
                <option value="esa">穷举搜索</option>
                <option value="tss">三步搜索</option>
                <option value="tdls">二维对数搜索</option>
                <option value="ntss">新三步搜索</option>
                <option value="fss">四步搜索</option>
                <option value="ds">菱形搜索</option>
                <option value="hexbs">基于 Hexagon</option>
                <option value="epzs">增强的预测区域</option>
                <option value="umh">不均匀多六边形</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">补偿模式</label>
            <div class="row-content">
              <select class="select-input" v-model="settings.mcMode">
                <option value="">运动补偿模式</option>
                <option value="obmc">重叠块运动补偿</option>
                <option value="aobmc">加权 obmc</option>
              </select>
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.vsmb" />
                可变块大小的运动补偿
              </label>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">识别</label>
            <div class="row-content column">
              <div class="input-row">
                <input 
                  type="text" 
                  class="text-input small" 
                  v-model="settings.blockSize"
                  placeholder="默认 16"
                />
                <span class="input-label">块大小</span>
                <input 
                  type="text" 
                  class="text-input small" 
                  v-model="settings.searchRange"
                  placeholder="默认 32"
                />
                <span class="input-label">搜索范围（像素）</span>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">场景变化</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input" 
                v-model="settings.scThreshold"
                placeholder="默认 10"
              />
              <span class="hint">留空以取消使用此参数</span>
            </div>
          </div>
        </div>
        
        <div class="dialog-footer">
          <button class="btn btn-cancel" @click="close">取消</button>
          <button class="btn btn-confirm" @click="confirm">确定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface InterpolationSettings {
  targetFps: string;
  interpolationMode: string;
  meMode: string;
  meAlgorithm: string;
  mcMode: string;
  vsmb: boolean;
  blockSize: string;
  searchRange: string;
  scThreshold: string;
}

const props = defineProps<{
  visible: boolean;
  modelValue: InterpolationSettings;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update:modelValue', value: InterpolationSettings): void;
}>();

const settings = ref<InterpolationSettings>({
  targetFps: '',
  interpolationMode: '',
  meMode: '',
  meAlgorithm: '',
  mcMode: '',
  vsmb: false,
  blockSize: '',
  searchRange: '',
  scThreshold: '',
});

watch(() => props.modelValue, (newVal) => {
  settings.value = { ...newVal };
}, { immediate: true });

function close() {
  emit('update:visible', false);
}

function confirm() {
  emit('update:modelValue', { ...settings.value });
  close();
}

function getFFmpegFilter(): string {
  if (!settings.value.targetFps && !settings.value.interpolationMode) return '';
  
  const params: string[] = [];
  
  if (settings.value.targetFps) {
    params.push(`fps=${settings.value.targetFps}`);
  }
  
  if (settings.value.interpolationMode) {
    params.push(`mi_mode=${settings.value.interpolationMode}`);
  }
  
  if (settings.value.meMode) {
    params.push(`me_mode=${settings.value.meMode}`);
  }
  
  if (settings.value.meAlgorithm) {
    params.push(`me=${settings.value.meAlgorithm}`);
  }
  
  if (settings.value.mcMode) {
    params.push(`mc_mode=${settings.value.mcMode}`);
  }
  
  if (settings.value.vsmb) {
    params.push('vsmb=1');
  }
  
  if (settings.value.blockSize) {
    params.push(`mb_size=${settings.value.blockSize}`);
  }
  
  if (settings.value.searchRange) {
    params.push(`search_param=${settings.value.searchRange}`);
  }
  
  if (settings.value.scThreshold) {
    params.push(`scd_threshold=${settings.value.scThreshold}`);
  }
  
  if (params.length === 0) return '';
  
  return `minterpolate=${params.join(':')}`;
}

defineExpose({
  getFFmpegFilter,
});
</script>

<style scoped>
.dialog-overlay {
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

.dialog-container {
  background: var(--bg-color2, #181818);
  border-radius: 8px;
  min-width: 734px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--bg-color3, #242424);
}

.dialog-title {
  color: #c0c0c0;
  font-size: 15px;
  font-weight: 500;
}

.dialog-content {
  padding: 10px;
}

.info-text {
  color: #888;
  font-size: 13px;
  margin-bottom: 10px;
  line-height: 1.6;
  padding: 10px;
}

.info-text p {
  margin: 0;
}

.form-row {
  display: flex;
  align-items: stretch;
  margin-bottom: 10px;
}

.row-label {
  width: 100px;
  background: var(--bg-color4, #303030);
  color: #c0c0c0;
  font-size: 14px;
  font-weight: 500;
  padding: 10px;
  text-align: center;
  border-radius: 4px 0 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.row-content {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--bg-color3, #242424);
  padding: 10px;
  border-radius: 0 4px 4px 0;
  gap: 10px;
}

.row-content.column {
  flex-direction: column;
  align-items: stretch;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.text-input {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-color1, #181818);
  border: none;
  border-radius: 15px;
  color: #c0c0c0;
  font-size: 13px;
  outline: none;
  max-width: 175px;
}

.text-input.small {
  max-width: 83px;
}

.text-input::placeholder {
  color: #555;
}

.select-input {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-color4, #303030);
  border: none;
  border-radius: 4px;
  color: #c0c0c0;
  font-size: 13px;
  outline: none;
  max-width: 175px;
  cursor: pointer;
}

.input-label {
  color: #888;
  font-size: 13px;
  min-width: 120px;
}

.hint {
  color: #666;
  font-size: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #c0c0c0;
  font-size: 13px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid var(--bg-color3, #242424);
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-cancel {
  background: var(--bg-color4, #383838);
  color: #888;
}

.btn-confirm {
  background: var(--bg-color4, #383838);
  color: #9acd32;
}

.btn:hover {
  opacity: 0.9;
}
</style>

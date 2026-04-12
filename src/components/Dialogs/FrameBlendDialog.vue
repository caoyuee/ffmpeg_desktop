<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="close">
      <div class="dialog-container">
        <div class="dialog-header">
          <span class="dialog-title">tblend 动态模糊</span>
        </div>
        
        <div class="dialog-content">
          <div class="info-text">
            <p>Time Blend 将相邻帧进行混合以模拟相机的效果</p>
            <p>但注意算法算出来的动态模糊不可能比得过真实录制的效果</p>
          </div>
          
          <div class="form-row">
            <label class="row-label">降低帧率</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input" 
                v-model="settings.frameRate"
                placeholder="在滤镜中指定帧率"
              />
              <span class="hint">可选</span>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">混合模式</label>
            <div class="row-content">
              <select class="select-input" v-model="settings.blendMode">
                <option value="">不使用</option>
                <option value="average">与前一帧的平均值</option>
                <option value="blend">插值混合</option>
                <option value="and">位运算 AND</option>
                <option value="or">位运算 OR</option>
                <option value="xor">位运算 XOR</option>
                <option value="add">像素值相加</option>
                <option value="multiply">像素值相乘</option>
              </select>
              <span class="hint">留空以取消使用此滤镜</span>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">混合比例</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input" 
                v-model="settings.ratio"
                placeholder="0.0~1.0"
              />
              <span class="hint">不一定有效</span>
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

interface FrameBlendSettings {
  frameRate: string;
  blendMode: string;
  ratio: string;
}

const props = defineProps<{
  visible: boolean;
  modelValue: FrameBlendSettings;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update:modelValue', value: FrameBlendSettings): void;
}>();

const settings = ref<FrameBlendSettings>({
  frameRate: '',
  blendMode: '',
  ratio: '',
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
  if (!settings.value.blendMode) return '';
  
  const modeMap: Record<string, string> = {
    'average': 'average',
    'blend': 'blend',
    'and': 'and',
    'or': 'or',
    'xor': 'xor',
    'add': 'add',
    'multiply': 'multiply',
  };
  
  let filter = 'tblend';
  
  if (settings.value.blendMode) {
    filter += `=all_mode=${modeMap[settings.value.blendMode] || settings.value.blendMode}`;
  }
  
  if (settings.value.ratio) {
    filter += `:c0_opacity=${settings.value.ratio}`;
  }
  
  if (settings.value.frameRate) {
    filter = `fps=${settings.value.frameRate},${filter}`;
  }
  
  return filter;
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
  min-width: 500px;
  max-width: 600px;
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
  padding: 20px;
}

.info-text {
  color: #888;
  font-size: 13px;
  margin-bottom: 20px;
  line-height: 1.6;
}

.info-text p {
  margin: 0;
}

.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
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

.hint {
  color: #666;
  font-size: 12px;
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

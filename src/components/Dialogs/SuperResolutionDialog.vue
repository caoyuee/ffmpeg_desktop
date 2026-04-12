<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="close">
      <div class="dialog-container">
        <div class="dialog-header">
          <span class="dialog-title">libplacebo 超分</span>
        </div>
        
        <div class="dialog-content">
          <div class="info-text">
            <p>libplacebo 需要受支持的 GPU，过早的显卡型号可能无法运行</p>
            <p>直接在这里指定分辨率，不要在主参数面板上指定，可以用 iw*2 和 ih*2 表示倍数</p>
          </div>
          
          <div class="form-row">
            <label class="row-label">目标分辨率</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input small" 
                v-model="settings.width"
                placeholder="宽度"
              />
              <input 
                type="text" 
                class="text-input small" 
                v-model="settings.height"
                placeholder="高度"
              />
              <span class="hint">任一或两者留空以取消使用此滤镜</span>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">采样算法</label>
            <div class="row-content">
              <select class="select-input" v-model="settings.upscaler">
                <option value="">上采样算法 (放大用)</option>
                <option value="ewa_lanczos">ewa_lanczos</option>
                <option value="spline36">spline36</option>
                <option value="mitchell">mitchell</option>
                <option value="hermite">hermite</option>
              </select>
              <select class="select-input" v-model="settings.downscaler">
                <option value="">下采样算法 (缩小用)</option>
                <option value="ewa_lanczos">ewa_lanczos</option>
                <option value="spline36">spline36</option>
                <option value="mitchell">mitchell</option>
                <option value="hermite">hermite</option>
              </select>
              <span class="hint">建议用自定义着色器</span>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">抗振铃强度</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input small" 
                v-model="settings.antiRinging"
                placeholder=""
              />
              <span class="hint">[可选] 范围 0.0 ~ 1.0</span>
            </div>
          </div>
          
          <div class="form-row shader-row">
            <label class="row-label">自定义<br/>Shader<br/>着色器</label>
            <div class="row-content column">
              <div class="shader-toolbar">
                <button class="btn btn-shader" @click="addShader">添加</button>
                <button class="btn btn-shader" @click="removeShader" :disabled="selectedShaderIndex < 0">移除</button>
                <button class="btn btn-shader" @click="moveShaderUp" :disabled="selectedShaderIndex <= 0">上移</button>
                <button class="btn btn-shader" @click="moveShaderDown" :disabled="selectedShaderIndex >= shaders.length - 1">下移</button>
                <span class="shader-hint">支持 .glsl 和 .hook 格式</span>
                <button class="btn btn-shader download-btn" @click="downloadShaders">下载</button>
              </div>
              <div class="shader-list">
                <div 
                  v-for="(shader, index) in shaders" 
                  :key="index"
                  class="shader-item"
                  :class="{ selected: selectedShaderIndex === index }"
                  @click="selectedShaderIndex = index"
                >
                  {{ shader }}
                </div>
                <div v-if="shaders.length === 0" class="empty-shader">
                  拖拽着色器文件到此处或点击"添加"按钮
                </div>
              </div>
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
import { open } from '@tauri-apps/plugin-dialog';

interface SuperResolutionSettings {
  width: string;
  height: string;
  upscaler: string;
  downscaler: string;
  antiRinging: string;
  shaders: string[];
}

const props = defineProps<{
  visible: boolean;
  modelValue: SuperResolutionSettings;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update:modelValue', value: SuperResolutionSettings): void;
}>();

const settings = ref<SuperResolutionSettings>({
  width: '',
  height: '',
  upscaler: '',
  downscaler: '',
  antiRinging: '',
  shaders: [],
});

const shaders = ref<string[]>([]);
const selectedShaderIndex = ref(-1);

watch(() => props.modelValue, (newVal) => {
  settings.value = { ...newVal };
  shaders.value = [...newVal.shaders];
}, { immediate: true });

function close() {
  emit('update:visible', false);
}

function confirm() {
  settings.value.shaders = [...shaders.value];
  emit('update:modelValue', { ...settings.value });
  close();
}

async function addShader() {
  try {
    const files = await open({
      multiple: true,
      filters: [
        { name: '着色器文件', extensions: ['glsl', 'hook'] },
      ],
    });
    if (files) {
      const paths = Array.isArray(files) ? files : [files];
      shaders.value.push(...paths);
    }
  } catch (error) {
    console.error('添加着色器失败:', error);
  }
}

function removeShader() {
  if (selectedShaderIndex.value >= 0) {
    shaders.value.splice(selectedShaderIndex.value, 1);
    selectedShaderIndex.value = -1;
  }
}

function moveShaderUp() {
  if (selectedShaderIndex.value > 0) {
    const temp = shaders.value[selectedShaderIndex.value];
    shaders.value[selectedShaderIndex.value] = shaders.value[selectedShaderIndex.value - 1];
    shaders.value[selectedShaderIndex.value - 1] = temp;
    selectedShaderIndex.value--;
  }
}

function moveShaderDown() {
  if (selectedShaderIndex.value < shaders.value.length - 1) {
    const temp = shaders.value[selectedShaderIndex.value];
    shaders.value[selectedShaderIndex.value] = shaders.value[selectedShaderIndex.value + 1];
    shaders.value[selectedShaderIndex.value + 1] = temp;
    selectedShaderIndex.value++;
  }
}

function downloadShaders() {
  window.open('https://github.com/mpv-player/mpv/blob/master/TOOLS/vf_dlopen/glsl/', '_blank');
}

function getFFmpegFilter(): string {
  if (!settings.value.width && !settings.value.height && shaders.value.length === 0) return '';
  
  const params: string[] = [];
  
  if (settings.value.width) {
    params.push(`w=${settings.value.width}`);
  }
  
  if (settings.value.height) {
    params.push(`h=${settings.value.height}`);
  }
  
  if (settings.value.upscaler) {
    params.push(`upscaler=${settings.value.upscaler}`);
  }
  
  if (settings.value.downscaler) {
    params.push(`downscaler=${settings.value.downscaler}`);
  }
  
  if (settings.value.antiRinging) {
    params.push(`sigmoid_center=${settings.value.antiRinging}`);
  }
  
  for (const shader of shaders.value) {
    params.push(`custom_shader_path='${shader}'`);
  }
  
  if (params.length === 0) return '';
  
  return `libplacebo=${params.join(':')}`;
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
  min-width: 684px;
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

.form-row.shader-row {
  margin-bottom: 0;
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
  line-height: 1.4;
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

.hint {
  color: #666;
  font-size: 12px;
}

.shader-toolbar {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
}

.btn-shader {
  padding: 6px 12px;
  background: var(--bg-color4, #383838);
  border: none;
  color: #c0c0c0;
  font-size: 13px;
  cursor: pointer;
  border-radius: 0;
}

.btn-shader:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.download-btn {
  margin-left: auto;
}

.shader-hint {
  color: #666;
  font-size: 12px;
  margin-left: 10px;
}

.shader-list {
  min-height: 100px;
  background: var(--bg-color1, #181818);
  border-radius: 4px;
  overflow: auto;
}

.shader-item {
  padding: 8px 12px;
  color: #c0c0c0;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.shader-item:hover {
  background: var(--bg-color4, #383838);
}

.shader-item.selected {
  background: var(--bg-color5, #404040);
}

.empty-shader {
  padding: 30px;
  color: #555;
  font-size: 13px;
  text-align: center;
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

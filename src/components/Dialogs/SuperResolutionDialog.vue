<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="close">
      <div class="dialog-container">
        <div class="dialog-header">
          <span class="dialog-title">{{ t('dialog.superResolution.title') }}</span>
        </div>
        
        <div class="dialog-content">
          <div class="info-text">
            <p>{{ t('dialog.superResolution.description1') }}</p>
            <p>{{ t('dialog.superResolution.description2') }}</p>
          </div>
          
          <div class="form-row">
            <label class="row-label">{{ t('dialog.superResolution.targetResolution') }}</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input small" 
                v-model="settings.width"
                inputmode="numeric"
                :class="{ invalid: validationErrors.width }"
                @input="onNumericInput('width')"
                :placeholder="t('dialog.superResolution.widthPlaceholder')"
              />
              <input 
                type="text" 
                class="text-input small" 
                v-model="settings.height"
                inputmode="numeric"
                :class="{ invalid: validationErrors.height }"
                @input="onNumericInput('height')"
                :placeholder="t('dialog.superResolution.heightPlaceholder')"
              />
              <span class="hint">{{ t('dialog.superResolution.cancelFilterHint') }}</span>
              <span v-if="validationErrors.width || validationErrors.height" class="validation-error">{{ t('validation.positiveInteger') }}</span>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">{{ t('dialog.superResolution.samplingAlgorithm') }}</label>
            <div class="row-content">
              <select class="select-input" v-model="settings.upscaler">
                <option value="">{{ t('dialog.superResolution.upscalerPlaceholder') }}</option>
                <option value="ewa_lanczos">ewa_lanczos</option>
                <option value="spline36">spline36</option>
                <option value="mitchell">mitchell</option>
                <option value="hermite">hermite</option>
              </select>
              <select class="select-input" v-model="settings.downscaler">
                <option value="">{{ t('dialog.superResolution.downscalerPlaceholder') }}</option>
                <option value="ewa_lanczos">ewa_lanczos</option>
                <option value="spline36">spline36</option>
                <option value="mitchell">mitchell</option>
                <option value="hermite">hermite</option>
              </select>
              <span class="hint">{{ t('dialog.superResolution.customShaderHint') }}</span>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">{{ t('dialog.superResolution.antiRinging') }}</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input small" 
                v-model="settings.antiRinging"
                inputmode="decimal"
                :class="{ invalid: validationErrors.antiRinging }"
                @input="onNumericInput('antiRinging')"
                placeholder=""
              />
              <span class="hint">{{ t('dialog.superResolution.antiRingingHint') }}</span>
              <span v-if="validationErrors.antiRinging" class="validation-error">{{ t('validation.invalidNumber') }}</span>
            </div>
          </div>
          
          <div class="form-row shader-row">
            <label class="row-label multiline-label">{{ t('dialog.superResolution.customShaderLabel') }}</label>
            <div class="row-content column">
              <div class="shader-toolbar">
                <button class="btn btn-shader" @click="addShader">{{ t('dialog.superResolution.add') }}</button>
                <button class="btn btn-shader" @click="removeShader" :disabled="selectedShaderIndex < 0">{{ t('dialog.superResolution.remove') }}</button>
                <button class="btn btn-shader" @click="moveShaderUp" :disabled="selectedShaderIndex <= 0">{{ t('dialog.superResolution.moveUp') }}</button>
                <button class="btn btn-shader" @click="moveShaderDown" :disabled="selectedShaderIndex >= shaders.length - 1">{{ t('dialog.superResolution.moveDown') }}</button>
                <span class="shader-hint">{{ t('dialog.superResolution.supportedShaderFormats') }}</span>
                <button class="btn btn-shader download-btn" @click="downloadShaders">{{ t('dialog.superResolution.download') }}</button>
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
                  {{ t('dialog.superResolution.emptyShaderHint') }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="dialog-footer">
          <button class="btn btn-cancel" @click="close">{{ t('common.cancel') }}</button>
          <button class="btn btn-confirm" :disabled="hasValidationErrors" @click="confirm">{{ t('common.ok') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { open } from '@tauri-apps/plugin-dialog';
import { isNonNegativeDecimal, isPositiveInteger } from '@/utils/numericValidation';

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

const { t } = useI18n();

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
const validationErrors = ref({
  width: false,
  height: false,
  antiRinging: false,
});
const hasValidationErrors = computed(() => Object.values(validationErrors.value).some(Boolean));

watch(() => props.modelValue, (newVal) => {
  settings.value = { ...newVal };
  shaders.value = [...newVal.shaders];
  validationErrors.value = {
    width: false,
    height: false,
    antiRinging: false,
  };
}, { immediate: true });

function close() {
  emit('update:visible', false);
}

function confirm() {
  if (hasValidationErrors.value) return;
  settings.value.shaders = [...shaders.value];
  emit('update:modelValue', { ...settings.value });
  close();
}

function onNumericInput(field: keyof typeof validationErrors.value) {
  const value = settings.value[field];
  if (field === 'antiRinging') {
    validationErrors.value[field] = !isNonNegativeDecimal(value);
  } else {
    validationErrors.value[field] = !isPositiveInteger(value);
  }

  if (!validationErrors.value[field]) {
    emit('update:modelValue', { ...settings.value });
  }
}

async function addShader() {
  try {
    const files = await open({
      multiple: true,
      filters: [
        { name: t('dialog.superResolution.shaderFiles'), extensions: ['glsl', 'hook'] },
      ],
    });
    if (files) {
      const paths = Array.isArray(files) ? files : [files];
      shaders.value.push(...paths);
    }
  } catch (error) {
    console.error(t('dialog.superResolution.addShaderFailed'), error);
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
    shaders.value[selectedShaderIndex.value] = shaders.value[selectedShaderIndex.value - 1]!;
    shaders.value[selectedShaderIndex.value - 1] = temp!;
    selectedShaderIndex.value--;
  }
}

function moveShaderDown() {
  if (selectedShaderIndex.value < shaders.value.length - 1) {
    const temp = shaders.value[selectedShaderIndex.value];
    shaders.value[selectedShaderIndex.value] = shaders.value[selectedShaderIndex.value + 1]!;
    shaders.value[selectedShaderIndex.value + 1] = temp!;
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
  background: var(--overlay-bg, rgba(0, 0, 0, 0.7));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-container {
  background: var(--bg-color2, #181818);
  border-radius: 8px;
  min-width: 684px;
  box-shadow: 0 4px 20px var(--shadow-color, rgba(0, 0, 0, 0.5));
}

.dialog-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--bg-color3, #242424);
}

.dialog-title {
  color: var(--text-color1, #c0c0c0);
  font-size: 15px;
  font-weight: 500;
}

.dialog-content {
  padding: 10px;
}

.info-text {
  color: var(--text-color2, #888);
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
  color: var(--text-color1, #c0c0c0);
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

.multiline-label {
  white-space: pre-line;
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
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  outline: none;
  max-width: 175px;
}

.text-input.invalid {
  border-color: var(--error-color, #e74c3c);
}

.text-input.small {
  max-width: 83px;
}

.text-input::placeholder {
  color: var(--text-color3, #555);
}

.select-input {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-color4, #303030);
  border: none;
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  outline: none;
  max-width: 175px;
  cursor: pointer;
}

.hint {
  color: var(--text-color3, #666);
  font-size: 12px;
}

.validation-error {
  color: var(--error-color, #e74c3c);
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
  color: var(--text-color1, #c0c0c0);
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
  color: var(--text-color3, #666);
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
  color: var(--text-color1, #c0c0c0);
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
  color: var(--text-color3, #555);
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
  color: var(--text-color2, #888);
}

.btn-confirm {
  background: var(--bg-color4, #383838);
  color: var(--active-color, #9acd32);
}

.btn:hover {
  opacity: 0.9;
}
</style>

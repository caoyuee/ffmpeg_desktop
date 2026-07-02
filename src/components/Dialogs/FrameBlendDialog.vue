<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="close">
      <div class="dialog-container">
        <div class="dialog-header">
          <span class="dialog-title">{{ t('dialog.frameBlend.title') }}</span>
        </div>
        
        <div class="dialog-content">
          <div class="info-text">
            <p>{{ t('dialog.frameBlend.description1') }}</p>
            <p>{{ t('dialog.frameBlend.description2') }}</p>
          </div>
          
          <div class="form-row">
            <label class="row-label">{{ t('dialog.frameBlend.reduceFrameRate') }}</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input" 
                v-model="settings.frameRate"
                inputmode="decimal"
                :class="{ invalid: validationErrors.frameRate }"
                @input="onNumericInput('frameRate')"
                :placeholder="t('dialog.frameBlend.frameRatePlaceholder')"
              />
              <span class="hint">{{ t('dialog.frameBlend.optional') }}</span>
              <span v-if="validationErrors.frameRate" class="validation-error">{{ t('validation.invalidNumber') }}</span>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">{{ t('dialog.frameBlend.blendMode') }}</label>
            <div class="row-content">
              <select class="select-input" v-model="settings.blendMode">
                <option value="">{{ t('dialog.frameBlend.doNotUse') }}</option>
                <option value="average">{{ t('dialog.frameBlend.averagePreviousFrame') }}</option>
                <option value="blend">{{ t('dialog.frameBlend.blend') }}</option>
                <option value="and">{{ t('dialog.frameBlend.bitwiseAnd') }}</option>
                <option value="or">{{ t('dialog.frameBlend.bitwiseOr') }}</option>
                <option value="xor">{{ t('dialog.frameBlend.bitwiseXor') }}</option>
                <option value="add">{{ t('dialog.frameBlend.addPixels') }}</option>
                <option value="multiply">{{ t('dialog.frameBlend.multiplyPixels') }}</option>
              </select>
              <span class="hint">{{ t('dialog.frameBlend.cancelFilterHint') }}</span>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">{{ t('dialog.frameBlend.blendRatio') }}</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input" 
                v-model="settings.ratio"
                inputmode="decimal"
                :class="{ invalid: validationErrors.ratio }"
                @input="onNumericInput('ratio')"
                :placeholder="t('dialog.frameBlend.ratioPlaceholder')"
              />
              <span class="hint">{{ t('dialog.frameBlend.mayNotWork') }}</span>
              <span v-if="validationErrors.ratio" class="validation-error">{{ t('validation.invalidNumber') }}</span>
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
import { isNonNegativeDecimal, isPositiveDecimal } from '@/utils/numericValidation';

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

const { t } = useI18n();

const settings = ref<FrameBlendSettings>({
  frameRate: '',
  blendMode: '',
  ratio: '',
});
const validationErrors = ref({
  frameRate: false,
  ratio: false,
});
const hasValidationErrors = computed(() => Object.values(validationErrors.value).some(Boolean));

watch(() => props.modelValue, (newVal) => {
  settings.value = { ...newVal };
  validationErrors.value = {
    frameRate: false,
    ratio: false,
  };
}, { immediate: true });

function close() {
  emit('update:visible', false);
}

function confirm() {
  if (hasValidationErrors.value) return;
  emit('update:modelValue', { ...settings.value });
  close();
}

function onNumericInput(field: keyof typeof validationErrors.value) {
  const value = settings.value[field];
  validationErrors.value[field] = field === 'ratio'
    ? !isNonNegativeDecimal(value)
    : !isPositiveDecimal(value);

  if (!validationErrors.value[field]) {
    emit('update:modelValue', { ...settings.value });
  }
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
  background: var(--overlay-bg, rgba(0, 0, 0, 0.7));
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
  padding: 20px;
}

.info-text {
  color: var(--text-color2, #888);
  font-size: 13px;
  margin-bottom: 20px;
  line-height: 1.6;
}

.info-text p {
  margin: 0;
}

.form-row {
  display: flex;
  align-items: stretch;
  margin-bottom: 15px;
}

.row-label {
  width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color4, #303030);
  color: var(--text-color1, #c0c0c0);
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
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  outline: none;
  max-width: 175px;
}

.text-input.invalid {
  border-color: var(--error-color, #e74c3c);
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

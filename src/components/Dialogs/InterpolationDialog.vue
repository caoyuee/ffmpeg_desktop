<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="close">
      <div class="dialog-container">
        <div class="dialog-header">
          <span class="dialog-title">{{ t('dialog.interpolation.title') }}</span>
        </div>
        
        <div class="dialog-content">
          <div class="info-text">
            <p>{{ t('dialog.interpolation.description1') }}</p>
            <p>{{ t('dialog.interpolation.description2') }}</p>
          </div>
          
          <div class="form-row">
            <label class="row-label">{{ t('dialog.interpolation.targetFrameRate') }}</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input" 
                v-model="settings.targetFps"
                inputmode="decimal"
                :class="{ invalid: validationErrors.targetFps }"
                @input="onNumericInput('targetFps')"
                :placeholder="t('dialog.interpolation.targetFrameRatePlaceholder')"
              />
              <span class="hint">{{ t('dialog.interpolation.cancelFilterHint') }}</span>
              <span v-if="validationErrors.targetFps" class="validation-error">{{ t('validation.invalidNumber') }}</span>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">{{ t('dialog.interpolation.algorithmMode') }}</label>
            <div class="row-content">
              <select class="select-input" v-model="settings.interpolationMode">
                <option value="">{{ t('dialog.interpolation.interpolationMode') }}</option>
                <option value="2">{{ t('dialog.interpolation.twoFrameWeightedAverage') }}</option>
                <option value="mci">{{ t('dialog.interpolation.motionCompensatedInterpolation') }}</option>
              </select>
              <select class="select-input" v-model="settings.meMode">
                <option value="">{{ t('dialog.interpolation.motionEstimationMode') }}</option>
                <option value="bidir">{{ t('dialog.interpolation.bidirectionalMotionEstimation') }}</option>
                <option value="bilat">{{ t('dialog.interpolation.bilateralMotionEstimation') }}</option>
              </select>
              <select class="select-input" v-model="settings.meAlgorithm">
                <option value="">{{ t('dialog.interpolation.motionEstimationAlgorithm') }}</option>
                <option value="esa">{{ t('dialog.interpolation.exhaustiveSearch') }}</option>
                <option value="tss">{{ t('dialog.interpolation.threeStepSearch') }}</option>
                <option value="tdls">{{ t('dialog.interpolation.twoDimensionalLogSearch') }}</option>
                <option value="ntss">{{ t('dialog.interpolation.newThreeStepSearch') }}</option>
                <option value="fss">{{ t('dialog.interpolation.fourStepSearch') }}</option>
                <option value="ds">{{ t('dialog.interpolation.diamondSearch') }}</option>
                <option value="hexbs">{{ t('dialog.interpolation.hexagonBasedSearch') }}</option>
                <option value="epzs">{{ t('dialog.interpolation.enhancedPredictiveZonalSearch') }}</option>
                <option value="umh">{{ t('dialog.interpolation.unevenMultiHexagonSearch') }}</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">{{ t('dialog.interpolation.compensationMode') }}</label>
            <div class="row-content">
              <select class="select-input" v-model="settings.mcMode">
                <option value="">{{ t('dialog.interpolation.motionCompensationMode') }}</option>
                <option value="obmc">{{ t('dialog.interpolation.overlappedBlockMotionCompensation') }}</option>
                <option value="aobmc">{{ t('dialog.interpolation.adaptiveOverlappedBlockMotionCompensation') }}</option>
              </select>
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.vsmb" />
                {{ t('dialog.interpolation.variableSizeMotionCompensation') }}
              </label>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">{{ t('dialog.interpolation.detection') }}</label>
            <div class="row-content column">
              <div class="input-row">
                <input 
                  type="text" 
                  class="text-input small" 
                  v-model="settings.blockSize"
                  inputmode="numeric"
                  :class="{ invalid: validationErrors.blockSize }"
                  @input="onNumericInput('blockSize')"
                  :placeholder="t('dialog.interpolation.default16')"
                />
                <span class="input-label">{{ t('dialog.interpolation.blockSize') }}</span>
                <input 
                  type="text" 
                  class="text-input small" 
                  v-model="settings.searchRange"
                  inputmode="numeric"
                  :class="{ invalid: validationErrors.searchRange }"
                  @input="onNumericInput('searchRange')"
                  :placeholder="t('dialog.interpolation.default32')"
                />
                <span class="input-label">{{ t('dialog.interpolation.searchRangePixels') }}</span>
                <span v-if="validationErrors.blockSize || validationErrors.searchRange" class="validation-error">{{ t('validation.positiveInteger') }}</span>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <label class="row-label">{{ t('dialog.interpolation.sceneChange') }}</label>
            <div class="row-content">
              <input 
                type="text" 
                class="text-input" 
                v-model="settings.scThreshold"
                inputmode="decimal"
                :class="{ invalid: validationErrors.scThreshold }"
                @input="onNumericInput('scThreshold')"
                :placeholder="t('dialog.interpolation.default10')"
              />
              <span class="hint">{{ t('dialog.interpolation.cancelParamHint') }}</span>
              <span v-if="validationErrors.scThreshold" class="validation-error">{{ t('validation.invalidNumber') }}</span>
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
import { isPositiveDecimal, isPositiveInteger } from '@/utils/numericValidation';

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

const { t } = useI18n();

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
const validationErrors = ref({
  targetFps: false,
  blockSize: false,
  searchRange: false,
  scThreshold: false,
});
const hasValidationErrors = computed(() => Object.values(validationErrors.value).some(Boolean));

watch(() => props.modelValue, (newVal) => {
  settings.value = { ...newVal };
  validationErrors.value = {
    targetFps: false,
    blockSize: false,
    searchRange: false,
    scThreshold: false,
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

  if (field === 'blockSize' || field === 'searchRange') {
    validationErrors.value[field] = !isPositiveInteger(value);
  } else {
    validationErrors.value[field] = !isPositiveDecimal(value);
  }

  if (!validationErrors.value[field]) {
    emit('update:modelValue', { ...settings.value });
  }
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
  background: var(--overlay-bg, rgba(0, 0, 0, 0.7));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-container {
  background: var(--bg-color2, #181818);
  border-radius: 8px;
  min-width: 734px;
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

.input-label {
  color: var(--text-color2, #888);
  font-size: 13px;
  min-width: 120px;
}

.hint {
  color: var(--text-color3, #666);
  font-size: 12px;
}

.validation-error {
  color: var(--error-color, #e74c3c);
  font-size: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  -webkit-appearance: checkbox;
  appearance: checkbox;
  width: 16px;
  height: 16px;
  min-width: 16px;
  margin: 0;
  padding: 0;
  border: none;
  cursor: pointer;
  accent-color: var(--info-color, #3498db);
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

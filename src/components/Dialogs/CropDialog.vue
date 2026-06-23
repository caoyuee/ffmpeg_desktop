<template>
  <div class="crop-dialog-overlay" v-if="visible" @click.self="close">
    <div class="crop-dialog">
      <div class="dialog-header">
        <h3>{{ t('dialog.crop.title') }}</h3>
      </div>
      
      <div class="info-section">
        <div class="info-text">
          <p>{{ t('dialog.crop.instruction1') }}</p>
          <p>{{ t('dialog.crop.instruction2') }}</p>
          <p>{{ t('dialog.crop.instruction3') }}</p>
        </div>
        <div class="magnifiers">
          <div class="magnifier">
            <canvas ref="leftTopMagnifier" width="115" height="115"></canvas>
          </div>
          <div class="magnifier">
            <canvas ref="rightBottomMagnifier" width="115" height="115"></canvas>
          </div>
        </div>
      </div>
      
      <div class="toolbar">
        <button class="btn btn-open" @click="openVideo">
          <span class="icon">📁</span> {{ t('dialog.crop.open') }}
        </button>
        <input 
          type="text" 
          class="crop-input" 
          v-model="cropParams"
          :placeholder="t('dialog.crop.cropPlaceholder')"
          @keydown.enter="applyCropParams"
        />
        <button class="btn btn-confirm" @click="confirm">
          <span class="icon">✓</span> {{ t('dialog.crop.complete') }}
        </button>
        <input 
          type="text" 
          class="timestamp-input" 
          v-model="timestamp"
          :placeholder="t('dialog.crop.timestamp')"
        />
        <select class="ratio-select" v-model="aspectRatio">
          <option value="0">{{ t('dialog.crop.free') }}</option>
          <option value="21/9">21:9</option>
          <option value="16/9">16:9</option>
          <option value="3/2">3:2</option>
          <option value="2/1">2:1</option>
          <option value="4/3">4:3</option>
          <option value="1/1">1:1</option>
        </select>
        <label class="center-checkbox">
          <input type="checkbox" v-model="centerCrop" />
          {{ t('dialog.crop.center') }}
        </label>
      </div>
      
      <div 
        class="preview-container"
        ref="previewContainer"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <div class="preview-wrapper" v-if="previewImage" ref="previewWrapper">
          <canvas 
            ref="previewCanvas"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @contextmenu.prevent
          ></canvas>
        </div>
        <div class="drop-hint" v-else>
          <span>{{ t('dialog.crop.dropHint') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  modelValue: boolean;
  initialCrop?: string;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm', crop: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialCrop: '',
});

const emit = defineEmits<Emits>();

const { t } = useI18n();

const visible = ref(props.modelValue);
const previewImage = ref<HTMLImageElement | null>(null);
const cropParams = ref(props.initialCrop);
const timestamp = ref('');
const aspectRatio = ref('0');
const centerCrop = ref(false);

const previewCanvas = ref<HTMLCanvasElement | null>(null);
const previewContainer = ref<HTMLDivElement | null>(null);
const previewWrapper = ref<HTMLDivElement | null>(null);
const leftTopMagnifier = ref<HTMLCanvasElement | null>(null);
const rightBottomMagnifier = ref<HTMLCanvasElement | null>(null);

let cropRect = { x: 0, y: 0, width: 200, height: 100 };
let isDraggingLeftTop = false;
let isDraggingRightBottom = false;
let imageWidth = 0;
let imageHeight = 0;

function parseAspectRatio(ratioStr: string): number | null {
  if (ratioStr === '0') return null;
  const parts = ratioStr.split('/');
  if (parts.length === 2) {
    const num = parseFloat(parts[0]!);
    const den = parseFloat(parts[1]!);
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      return num / den;
    }
  }
  return null;
}

watch(() => props.modelValue, (val) => {
  visible.value = val;
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

function close() {
  visible.value = false;
}

async function openVideo() {
  try {
    const file = await open({
      multiple: false,
      filters: [{ name: t('dialog.crop.videoFiles'), extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', '*'] }],
    });
    if (file) {
      await loadVideoFrame(file as string);
    }
  } catch (error) {
    console.error(t('dialog.crop.openVideoFailed'), error);
  }
}

async function loadVideoFrame(videoPath: string) {
  try {
    const ts = timestamp.value || '0:0:10';
    const imageData = await invoke<string>('extract_video_frame', {
      videoPath,
      timestamp: ts,
    });
    
    const img = new Image();
    img.onload = () => {
      previewImage.value = img;
      imageWidth = img.width;
      imageHeight = img.height;
      
      cropRect = {
        x: Math.floor((imageWidth - 800) / 2),
        y: Math.floor((imageHeight - 450) / 2),
        width: Math.min(800, imageWidth),
        height: Math.min(450, imageHeight),
      };
      
      updateCropParams();
      nextTick(() => {
        drawPreview();
        updateMagnifiers();
      });
    };
    img.src = `data:image/png;base64,${imageData}`;
  } catch (error) {
    console.error(t('dialog.crop.extractFrameFailed'), error);
  }
}

function drawPreview() {
  if (!previewCanvas.value || !previewImage.value) return;
  
  const canvas = previewCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  
  ctx.drawImage(previewImage.value, 0, 0);
  
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
}

function updateMagnifiers() {
  if (!previewImage.value || !leftTopMagnifier.value || !rightBottomMagnifier.value) return;
  
  drawMagnifier(leftTopMagnifier.value, cropRect.x, cropRect.y);
  drawMagnifier(rightBottomMagnifier.value, cropRect.x + cropRect.width - 1, cropRect.y + cropRect.height - 1);
}

function drawMagnifier(canvas: HTMLCanvasElement, centerX: number, centerY: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !previewImage.value) return;
  
  const magnifierSize = 5;
  ctx.fillStyle = '#181818';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const sourceX = Math.max(0, centerX - magnifierSize);
  const sourceY = Math.max(0, centerY - magnifierSize);
  const sourceWidth = Math.min(magnifierSize * 2, imageWidth - sourceX);
  const sourceHeight = Math.min(magnifierSize * 2, imageHeight - sourceY);
  
  if (sourceWidth > 0 && sourceHeight > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      previewImage.value,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, canvas.width, canvas.height
    );
    
    const crossX = Math.floor((centerX - sourceX) / sourceWidth * canvas.width);
    const crossY = Math.floor((centerY - sourceY) / sourceHeight * canvas.height);
    
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(crossX, 0);
    ctx.lineTo(crossX, canvas.height);
    ctx.moveTo(0, crossY);
    ctx.lineTo(canvas.width, crossY);
    ctx.stroke();
  }
}

function onMouseDown(event: MouseEvent) {
  if (event.button === 0) {
    isDraggingLeftTop = true;
  } else if (event.button === 2) {
    isDraggingRightBottom = true;
  }
}

function onMouseMove(event: MouseEvent) {
  if (!isDraggingLeftTop && !isDraggingRightBottom) return;
  
  const rect = previewCanvas.value?.getBoundingClientRect();
  if (!rect) return;
  
  const x = Math.floor((event.clientX - rect.left) * (imageWidth / rect.width));
  const y = Math.floor((event.clientY - rect.top) * (imageHeight / rect.height));
  
  if (isDraggingLeftTop) {
    handleLeftTopDrag(x, y);
  } else if (isDraggingRightBottom) {
    handleRightBottomDrag(x, y);
  }
  
  if (centerCrop.value) {
    cropRect.x = Math.floor((imageWidth - cropRect.width) / 2);
    cropRect.y = Math.floor((imageHeight - cropRect.height) / 2);
  }
  
  updateCropParams();
  drawPreview();
  updateMagnifiers();
}

function onMouseUp() {
  isDraggingLeftTop = false;
  isDraggingRightBottom = false;
}

function handleLeftTopDrag(x: number, y: number) {
  if (x > cropRect.x + cropRect.width || y > cropRect.y + cropRect.height) {
    isDraggingLeftTop = false;
    isDraggingRightBottom = true;
    cropRect = {
      x: cropRect.x,
      y: cropRect.y,
      width: Math.max(1, x - cropRect.x),
      height: Math.max(1, y - cropRect.y),
    };
  } else {
    const newX = Math.max(0, Math.min(x, cropRect.x + cropRect.width - 1));
    const newY = Math.max(0, Math.min(y, cropRect.y + cropRect.height - 1));
    let newWidth = cropRect.x + cropRect.width - newX;
    let newHeight = cropRect.y + cropRect.height - newY;
    
    const ratio1 = parseAspectRatio(aspectRatio.value);
    if (ratio1 !== null) {
      newHeight = Math.floor(newWidth / ratio1);
    }

    newWidth = Math.min(newWidth, imageWidth - newX);
    newHeight = Math.min(newHeight, imageHeight - newY);

    cropRect = { x: newX, y: newY, width: newWidth, height: newHeight };
  }
}

function handleRightBottomDrag(x: number, y: number) {
  if (x < cropRect.x || y < cropRect.y) {
    isDraggingRightBottom = false;
    isDraggingLeftTop = true;
    cropRect = {
      x: x,
      y: y,
      width: cropRect.x + cropRect.width - x,
      height: cropRect.y + cropRect.height - y,
    };
  } else {
    let newWidth = Math.max(1, Math.min(x - cropRect.x, imageWidth - cropRect.x));
    let newHeight = Math.max(1, Math.min(y - cropRect.y, imageHeight - cropRect.y));
    
    const ratio2 = parseAspectRatio(aspectRatio.value);
    if (ratio2 !== null) {
      newHeight = Math.floor(newWidth / ratio2);
      if (cropRect.y + newHeight > imageHeight) {
        newHeight = imageHeight - cropRect.y;
        newWidth = Math.floor(newHeight * ratio2);
      }
    }
    
    cropRect = { ...cropRect, width: newWidth, height: newHeight };
  }
}

function updateCropParams() {
  cropParams.value = `${cropRect.width}:${cropRect.height}:${cropRect.x}:${cropRect.y}`;
}

function applyCropParams() {
  const parts = cropParams.value.split(':');
  if (parts.length === 4) {
    const [w, h, x, y] = parts.map(Number);
    if (!isNaN(w!) && !isNaN(h!) && w! > 0 && h! > 0) {
      cropRect = { x: x!, y: y!, width: w!, height: h! };
      if (centerCrop.value) {
        cropRect.x = Math.floor((imageWidth - cropRect.width) / 2);
        cropRect.y = Math.floor((imageHeight - cropRect.height) / 2);
      }
      drawPreview();
      updateMagnifiers();
    }
  }
}

function confirm() {
  if (cropParams.value) {
    emit('confirm', cropParams.value);
    close();
  }
}

async function onDrop(event: DragEvent) {
  const files = event.dataTransfer?.getData('text/uri-list')?.split('\n');
  if (files && files[0]) {
    const path = files[0].trim().replace('file://', '');
    await loadVideoFrame(decodeURIComponent(path));
  }
}

onUnmounted(() => {
  if (previewImage.value) {
    previewImage.value = null;
  }
});
</script>

<style scoped>
.crop-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg, rgba(0, 0, 0, 0.8));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.crop-dialog {
  width: 900px;
  height: 650px;
  background: var(--bg-color2, #181818);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--bg-color3, #242424);
}

.dialog-header h3 {
  margin: 0;
  color: var(--text-color1, #c0c0c0);
  font-size: 16px;
  font-weight: normal;
}

.info-section {
  display: flex;
  padding: 15px 20px;
  background: var(--bg-color3, #242424);
}

.info-text {
  flex: 1;
}

.info-text p {
  margin: 0 0 8px 0;
  color: var(--text-color2, #888);
  font-size: 12px;
  line-height: 1.6;
}

.magnifiers {
  display: flex;
  gap: 10px;
}

.magnifier {
  width: 115px;
  height: 115px;
  background: var(--bg-color1, #181818);
  border-radius: 4px;
}

.magnifier canvas {
  width: 100%;
  height: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: var(--bg-color3, #242424);
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

.btn-open {
  background: var(--bg-color4, #383838);
  color: var(--active-color, #9acd32);
}

.btn-confirm {
  background: var(--bg-color4, #383838);
  color: var(--warning-color, #daa520);
}

.crop-input {
  flex: 1;
  max-width: 200px;
  padding: 6px 12px;
  background: var(--bg-color1, #181818);
  border: none;
  border-radius: 15px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  outline: none;
}

.crop-input::placeholder {
  color: var(--text-color3, #555);
}

.timestamp-input {
  width: 150px;
  padding: 6px 12px;
  background: var(--bg-color1, #181818);
  border: none;
  border-radius: 15px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  outline: none;
}

.timestamp-input::placeholder {
  color: var(--text-color3, #555);
}

.ratio-select {
  width: 100px;
  padding: 6px 12px;
  background: var(--bg-color4, #303030);
  border: none;
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.center-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  cursor: pointer;
}

.center-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.preview-container {
  flex: 1;
  overflow: auto;
  background: var(--bg-color4, #303030);
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

.preview-wrapper {
  padding: 1px;
  background: var(--active-color, #9acd32);
}

.preview-wrapper canvas {
  display: block;
  cursor: crosshair;
}

.drop-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-color3, #555);
  font-size: 14px;
}
</style>

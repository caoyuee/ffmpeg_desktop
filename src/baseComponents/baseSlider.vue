<template>
    <div class="slider-container">
        <input type="range" class="custom-slider" :min="props.min" :max="props.max" :value="props.modelValue"
            @input="handleInput">
        <span class="slider-value">{{ props.modelValue }}</span>
    </div>
</template>
<script lang="ts" setup>

interface Props {
    modelValue: number,
    min: number,
    max: number,
}
const props = withDefaults(defineProps<Props>(), {
    modelValue: 0,
    min: 0,
    max: 100,
})
const emit = defineEmits<{
    'update:modelValue': [value: any]
    'change': [value: any]
}>()

const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    const newValue = Number(target.value)
    emit('update:modelValue', newValue)
}
</script>
<style scoped>
/* 容器样式 */
.slider-container {
    width: 100%;
    height: 100%;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;

    .custom-slider {
        width: 100%;
        height: 0.75rem;
        border: 1px solid var(--input-focus-border);
    }

    .slider-value {
        color: var(--text-color1);
        font-size: 1rem;
        background: var(--text-color2);
        padding: 0.25rem 0.5rem;
        border-radius: 1rem;
        min-width: 3rem;
        text-align: center;
        margin-left: 0.5rem;
    }


}
</style>
<template>
    <label class="common-switch-container"
        :class="{ 'common-switch-has-text': showText, 'common-switch-disabled': props.disabled }"
        :style="[switchContainerStyles]">
        <div class="common-switch" :style="[switchStyles, themeStyles]">
            <input type="checkbox" :disabled="props.disabled" :name="props.name" :id="props.name" :form="props.form"
                :checked="isChecked" @change="handleChange" @focus="onFocus" @blur="onBlur" />
            <span class="common-switch-slider common-switch-slider-round"
                :class="{ 'common-switch-slider-checked': isChecked, 'common-switch-slider-focused': isFocused }"></span>
            <span v-if="showText" class="common-switch-text">
                {{ displayText }}
            </span>
        </div>
    </label>
</template>

<script setup lang="ts" name="CommonSwitch">
import { computed, ref } from 'vue'

interface Props {
    disabled?: boolean,
    name?: string,
    form?: string,
    modelValue: any, // 可以是任何类型，根据 activeValue/inactiveValue 决定

    // 新增功能
    size?: number, // 滑块尺寸，默认16
    activeValue?: any, // 开启时的值，默认true
    inactiveValue?: any, // 关闭时的值，默认false
    activeText?: string, // 开启时显示的文字
    inactiveText?: string, // 关闭时显示的文字
}

const props = withDefaults(defineProps<Props>(), {
    size: 16,
    activeValue: true,
    inactiveValue: false,
    activeText: '',
    inactiveText: '',
})

const isFocused = ref(false);

const onFocus = () => {
    isFocused.value = true;
};

const onBlur = () => {
    isFocused.value = false;
};

const emit = defineEmits<{
    'update:modelValue': [value: any]
    'change': [value: any]
}>()

// 计算当前是否选中
const isChecked = computed(() => {
    return props.modelValue === props.activeValue
})

// 计算显示的文字
const displayText = computed(() => {
    return isChecked.value ? props.activeText : props.inactiveText
})

// 是否显示文字
const showText = computed(() => {
    return props.activeText !== '' || props.inactiveText !== ''
})
const switchContainerStyles = computed(() => {
    const styles: Record<string, string> = {}
    styles['width'] = showText.value ? props.size * 5 + 'px' : props.size * 4 + 'px'
    return styles
})
// 计算样式
const switchStyles = computed(() => {
    const styles: Record<string, string> = {}
    // 根据size计算宽度：size * 4
    const baseWidth = props.size * 4 // 64px for size=16
    styles.width = `${baseWidth}px`

    // 高度设置：size * 2
    const baseHeight = props.size * 2 // 32px for size=16
    styles.height = `${baseHeight}px`

    return styles
})

// 计算主题颜色
const themeStyles = computed(() => {
    const styles: Record<string, string> = {}
    styles['--switch-bg'] = props.disabled ? '#ccc' : '#2196F3';
    styles['--switch-bg-inactive'] = '#ccc';
    styles['--switch-circle-bg'] = '#fff';
    return styles
})

// 处理change事件
const handleChange = (event: Event) => {
    if (props.disabled) return

    const target = event.target as HTMLInputElement
    const newValue = target.checked ? props.activeValue : props.inactiveValue

    emit('update:modelValue', newValue)
    emit('change', newValue)
}

// 暴露给父组件的方法
const toggle = () => {
    if (!props.disabled) {
        const newValue = isChecked.value ? props.inactiveValue : props.activeValue
        emit('update:modelValue', newValue)
        emit('change', newValue)
    }
}

const setValue = (value: any) => {
    if (!props.disabled) {
        emit('update:modelValue', value)
        emit('change', value)
    }
}

// 暴露方法给父组件
defineExpose({
    toggle,
    setValue
})
</script>

<style scoped>
.common-switch-container {
    display: inline-block;
    position: relative;
    line-height: 0;

    .common-switch-has-text {
        min-width: 100px;
    }

    .common-switch {
        position: relative;
        display: inline-block;
        -webkit-user-select: none;
        user-select: none;

        .common-switch-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
        }

        .common-switch-slider:before {
            position: absolute;
            content: "";
            transition: .4s;
            background-color: var(--switch-circle-bg-color1);
            box-shadow: var(--shadow-sm);
        }

        input:checked+.common-switch-slider {
            background-color: var(--switch-bg-active-color1);
        }

        input:focus+.common-switch-slider {
            box-shadow: var(--shadow-sm);
        }

        input:checked+.common-switch-slider:before {
            /* 移动距离 = 容器宽度 - 滑块宽度 - 2 * 边距 */
            transform: translateX(calc(v-bind('props.size') * 2px));
        }

        input:disabled+.common-switch-slider {
            cursor: not-allowed;
            opacity: 0.6;
        }

        .common-switch-slider.common-switch-slider-round {
            border-radius: calc(v-bind('props.size') * 2px);
        }

        .common-switch-slider.common-switch-slider-round:before {
            border-radius: 50%;
        }

        .common-switch-text {
            position: absolute;
            left: calc(100% + 4px);
            top: 50%;
            transform: translateY(-50%);
            font-size: 14px;
            color: var(--font-color1);
            white-space: nowrap;
            user-select: none;
        }
    }

    /* 动态计算滑块大小和位置 */
    .common-switch .common-switch-slider:before {
        /* 滑块大小为 size * 0.875 */
        height: calc(v-bind('props.size') * 1.75px);
        width: calc(v-bind('props.size') * 1.75px);
        /* 距离左侧和底部为 size * 0.125 */
        left: calc(v-bind('props.size') * 0.125px);
        bottom: calc(v-bind('props.size') * 0.125px);
    }

    .common-switch input {
        opacity: 0;
        width: 0;
        height: 0;
        position: absolute;
    }

}
</style>
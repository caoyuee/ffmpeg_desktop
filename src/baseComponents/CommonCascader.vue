<template>
    <div class="common-cascader">
        <select class="cascader-select" :style="{ width: `calc(${width} - 5px)` }" v-model="selectedValue"
            @change="handleChange">
            <option value="">请选择</option>
            <option v-for="option in options" :key="getOptionValue(option)" :value="getOptionValue(option)">
                {{ getOptionLabel(option) }}
            </option>
        </select>

        <CommonCascader :width="width" v-if="hasChildren && selectedValue" :options="getChildren(selectedValue)"
            :config="config" :value="innerValue" @update:value="handleChildUpdate" />
    </div>
</template>

<script lang="ts" setup name="CommonCascader">
import { ref, computed, watch } from 'vue'

interface CascaderConfig {
    label?: string
    value?: string
    children?: string
}

interface Props {
    options?: any[]
    config?: CascaderConfig
    value?: any[],
    width?: string
}
const props = withDefaults(defineProps<Props>(), {
    options: () => [],
    config: () => ({
        label: 'label',
        value: 'value',
        children: 'children'
    }),
    width: ''
})

const emit = defineEmits<{
    (e: 'update:value', value: any[]): void
}>()

const selectedValue = ref('')
const innerValue = ref<any[]>([])

const getOptionLabel = (option: any) => {
    return option[props.config.label || 'label']
}

const getOptionValue = (option: any) => {
    return option[props.config.value || 'value']
}

const getChildren = (value: string) => {
    const option = props.options.find(opt => getOptionValue(opt) === value)
    return option?.[props.config.children || 'children'] || []
}

const hasChildren = computed(() => {
    const option = props.options.find(opt => getOptionValue(opt) === selectedValue.value)
    return option && option[props.config.children || 'children']?.length > 0
})

const handleChange = (event: Event) => {
    const target = event.target as HTMLSelectElement
    selectedValue.value = target.value

    if (!hasChildren.value) {
        emit('update:value', [selectedValue.value])
    } else {
        innerValue.value = []
    }
}

const handleChildUpdate = (childValue: any[]) => {
    emit('update:value', [selectedValue.value, ...childValue])
}
// Watch for external value changes
watch(() => props.value, (newValue) => {
    if (newValue && newValue.length > 0) {
        selectedValue.value = newValue[0]
        if (newValue.length > 1) {
            innerValue.value = newValue.slice(1)
        }
    }
}, { immediate: true })
</script>

<style scoped>
.common-cascader {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
    position: relative;

    select {
        max-width: 12rem;
        min-width: 4rem;
        margin-right: 3px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
</style>
<template>
    <div id="snackbar" :class="[type, { show: isVisible }]">
        <span class="toast-icon">{{ icon }}</span>
        <span class="toast-message">{{ message }}</span>
    </div>
</template>
<script lang="ts" setup name="Toast">
import { ref, computed } from 'vue'
const isVisible = ref(false)
const message = ref('')
const type = ref<'success' | 'error' | 'info'>('info')
const duration = ref(3000)
const icon = computed(() => {
    switch (type.value) {
        case 'success': return '✓'
        case 'error': return '✕'
        case 'info': return 'ℹ'
        default: return 'ℹ'
    }
})

let timeoutId: NodeJS.Timeout | null = null
const showToast = (text: string, toastType: 'success' | 'error' | 'info' = 'info', toastDuration: number = 3000) => {

    timeoutId && clearTimeout(timeoutId)
    timeoutId = null
    message.value = text
    type.value = toastType
    duration.value = toastDuration
    isVisible.value = true
    timeoutId = setTimeout(() => {
        isVisible.value = false
    }, toastDuration)
}

defineExpose({
    success: (text: string, duration?: number) => showToast(text, 'success', duration),
    error: (text: string, duration?: number) => showToast(text, 'error', duration),
    info: (text: string, duration?: number) => showToast(text, 'info', duration),
    hide: () => {
        isVisible.value = false
        timeoutId && clearTimeout(timeoutId)
        timeoutId = null
    }
})
</script>
<style scoped>
#snackbar {
    visibility: hidden;
    min-width: 100px;
    /* margin-left: -125px; */
    color: #fff;
    text-align: center;
    border-radius: 5px;
    padding: 5px 10px;
    position: fixed;
    z-index: 1000;
    right: 20px;
    top: 15px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

#snackbar.show {
    visibility: visible;
    -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
    animation: fadein 0.5s, fadeout 0.5s 2.5s;
}

#snackbar.success {
    background-color: #4caf50;
}

#snackbar.error {
    background-color: #f44336;
}

#snackbar.info {
    background-color: #2196f3;
}

.toast-icon {
    font-weight: bold;
    font-size: 14px;
}

.toast-message {
    flex: 1;
    text-align: center;
}

@keyframes fadein {
    from {
        top: 0;
        opacity: 0;
    }

    to {
        top: 15px;
        opacity: 1;
    }
}

@keyframes fadeout {
    from {
        top: 15px;
        opacity: 1;
    }

    to {
        top: 0;
        opacity: 0;
    }
}
</style>
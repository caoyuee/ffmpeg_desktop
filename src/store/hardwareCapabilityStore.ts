import { invoke } from '@tauri-apps/api/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { HardwareBackend, HardwareCapabilities } from '@/types/hardware';

export const useHardwareCapabilityStore = defineStore('hardwareCapability', () => {
  const capabilities = ref<HardwareCapabilities | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const availableBackends = computed<HardwareBackend[]>(() => capabilities.value?.backends ?? []);
  const availableEncoders = computed<string[]>(() => capabilities.value?.encoders ?? []);

  function hasBackend(backend: HardwareBackend): boolean {
    return availableBackends.value.includes(backend);
  }

  function hasEncoder(encoder: string): boolean {
    return availableEncoders.value.includes(encoder);
  }

  async function detect(path?: string): Promise<HardwareCapabilities | null> {
    loading.value = true;
    error.value = null;

    try {
      const result = await invoke<HardwareCapabilities>('detect_hardware_acceleration', {
        path,
      });
      capabilities.value = result;
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      error.value = message;
      capabilities.value = null;
      return null;
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    capabilities.value = null;
    error.value = null;
    loading.value = false;
  }

  return {
    capabilities,
    loading,
    error,
    availableBackends,
    availableEncoders,
    hasBackend,
    hasEncoder,
    detect,
    clear,
  };
});

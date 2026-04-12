import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { PresetData } from "@/types/preset";
import { DEFAULT_PRESET } from "@/types/preset";
import { invoke } from "@tauri-apps/api/core";

export const usePresetStore = defineStore("presets", () => {
  const presets = ref<PresetData[]>([]);
  const currentPreset = ref<PresetData>({ ...DEFAULT_PRESET });
  const presetDirectory = ref<string>("");

  const presetCount = computed(() => presets.value.length);

  async function loadPresets() {
    try {
      const loadedPresets = await invoke<PresetData[]>("load_presets");
      presets.value = loadedPresets;
    } catch (error) {
      console.error("加载预设失败:", error);
      presets.value = [];
    }
  }

  async function savePreset(preset: PresetData) {
    try {
      const savedPreset = await invoke<PresetData>("save_preset", { preset });

      const index = presets.value.findIndex((p) => p.id === savedPreset.id);
      if (index >= 0) {
        presets.value[index] = savedPreset;
      } else {
        presets.value.push(savedPreset);
      }

      return savedPreset;
    } catch (error) {
      console.error("保存预设失败:", error);
      throw error;
    }
  }

  async function deletePreset(presetId: string) {
    try {
      await invoke("delete_preset", { presetId });
      presets.value = presets.value.filter((p) => p.id !== presetId);

      if (currentPreset.value.id === presetId) {
        currentPreset.value = { ...DEFAULT_PRESET };
      }
    } catch (error) {
      console.error("删除预设失败:", error);
      throw error;
    }
  }

  function setCurrentPreset(preset: PresetData) {
    currentPreset.value = { ...preset };
  }

  function resetCurrentPreset() {
    currentPreset.value = { ...DEFAULT_PRESET };
  }

  function duplicatePreset(presetId: string) {
    const preset = presets.value.find((p) => p.id === presetId);
    if (preset) {
      const duplicated: PresetData = {
        ...preset,
        id: "",
        name: `${preset.name} (副本)`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return savePreset(duplicated);
    }
    return null;
  }

  async function exportPreset(presetId: string, filePath: string) {
    try {
      await invoke("export_preset", { presetId, filePath });
    } catch (error) {
      console.error("导出预设失败:", error);
      throw error;
    }
  }

  async function importPreset(filePath: string) {
    try {
      const preset = await invoke<PresetData>("import_preset", { filePath });
      presets.value.push(preset);
      return preset;
    } catch (error) {
      console.error("导入预设失败:", error);
      throw error;
    }
  }

  return {
    presets,
    currentPreset,
    presetDirectory,
    presetCount,
    loadPresets,
    savePreset,
    deletePreset,
    setCurrentPreset,
    resetCurrentPreset,
    duplicatePreset,
    exportPreset,
    importPreset,
  };
});

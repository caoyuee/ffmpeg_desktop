import { defineStore } from "pinia";
import { ref } from "vue";

export const useFileListStore = defineStore("fileList", () => {
  const files = ref<string[]>([]);
  const selectedIndices = ref<number[]>([]);

  function addFiles(paths: string[]) {
    files.value = [...files.value, ...paths];
  }

  function removeSelected() {
    const toRemove = new Set(selectedIndices.value);
    files.value = files.value.filter((_, index) => !toRemove.has(index));
    selectedIndices.value = [];
  }

  function removeFile(index: number) {
    files.value.splice(index, 1);
    selectedIndices.value = selectedIndices.value
      .filter(i => i !== index)
      .map(i => (i > index ? i - 1 : i));
  }

  function clear() {
    files.value = [];
    selectedIndices.value = [];
  }

  function sortByName() {
    files.value = [...files.value].sort((a, b) => a.localeCompare(b));
  }

  return {
    files,
    selectedIndices,
    addFiles,
    removeSelected,
    removeFile,
    clear,
    sortByName,
  };
});

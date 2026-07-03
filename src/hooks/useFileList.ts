import { ref, computed } from "vue";
import { MediaInfo } from "./useMediaProbe";

export interface FileItem {
  path: string;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
  mediaInfo?: MediaInfo;
}

export function useFileList() {
  const fileList = ref<FileItem[]>([]);
  const currentIndex = ref(-1);

  const currentFile = computed(() => {
    if (currentIndex.value >= 0 && currentIndex.value < fileList.value.length) {
      return fileList.value[currentIndex.value] ?? null;
    }
    return null;
  });

  const pendingFiles = computed(() =>
    fileList.value.filter((f) => f.status === "pending"),
  );
  const processingFiles = computed(() =>
    fileList.value.filter((f) => f.status === "processing"),
  );
  const successFiles = computed(() =>
    fileList.value.filter((f) => f.status === "success"),
  );
  const errorFiles = computed(() =>
    fileList.value.filter((f) => f.status === "error"),
  );

  function addFile(path: string, mediaInfo?: MediaInfo): void {
    const exists = fileList.value.some((f) => f.path === path);
    if (!exists) {
      const item: FileItem = {
        path,
        status: "pending",
      };
      if (mediaInfo) {
        item.mediaInfo = mediaInfo;
      }
      fileList.value.push(item);

      if (fileList.value.length === 1) {
        currentIndex.value = 0;
      }
    }
  }

  function addFiles(paths: string[]): void {
    paths.forEach((path) => addFile(path));
  }

  function removeFile(index: number): void {
    if (index < 0 || index >= fileList.value.length) {
      return;
    }

    fileList.value.splice(index, 1);

    if (fileList.value.length === 0) {
      currentIndex.value = -1;
    } else if (index === currentIndex.value) {
      currentIndex.value = Math.min(
        currentIndex.value,
        fileList.value.length - 1,
      );
    } else if (index < currentIndex.value) {
      currentIndex.value--;
    }
  }

  function clearAll(): void {
    fileList.value = [];
    currentIndex.value = -1;
  }

  function updateFileStatus(
    index: number,
    status: FileItem["status"],
    error?: string,
  ): void {
    const file = fileList.value[index];
    if (file) {
      file.status = status;
      if (error) {
        file.error = error;
      }
    }
  }

  function updateFileMediaInfo(index: number, mediaInfo: MediaInfo): void {
    const file = fileList.value[index];
    if (file) {
      file.mediaInfo = mediaInfo;
    }
  }

  function setCurrentIndex(index: number): void {
    if (index >= -1 && index < fileList.value.length) {
      currentIndex.value = index;
    }
  }

  function findFileIndex(path: string): number {
    return fileList.value.findIndex((f) => f.path === path);
  }

  function getFileName(path: string): string {
    const parts = path.split(/[\\\/]/);
    return parts[parts.length - 1] ?? path;
  }

  return {
    fileList,
    currentIndex,
    currentFile,
    pendingFiles,
    processingFiles,
    successFiles,
    errorFiles,
    addFile,
    addFiles,
    removeFile,
    clearAll,
    updateFileStatus,
    updateFileMediaInfo,
    setCurrentIndex,
    findFileIndex,
    getFileName,
  };
}

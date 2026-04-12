/**
 * 文件列表管理 Hook
 * 封装文件列表的增删改查逻辑
 */
import { ref, Ref, computed } from 'vue';
import { MediaInfo } from './useMediaProbe';

export interface FileItem {
    path: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    error?: string;
    mediaInfo?: MediaInfo;
}

export function useFileList() {
    const fileList = ref<FileItem[]>([]);
    const currentIndex = ref(-1);

    const currentFile = computed(() => {
        if (currentIndex.value >= 0 && currentIndex.value < fileList.value.length) {
            return fileList.value[currentIndex.value];
        }
        return null;
    });

    const pendingFiles = computed(() => fileList.value.filter(f => f.status === 'pending'));
    const processingFiles = computed(() => fileList.value.filter(f => f.status === 'processing'));
    const successFiles = computed(() => fileList.value.filter(f => f.status === 'success'));
    const errorFiles = computed(() => fileList.value.filter(f => f.status === 'error'));

    /**
     * 添加文件
     */
    function addFile(path: string, mediaInfo?: MediaInfo): void {
        const exists = fileList.value.some(f => f.path === path);
        if (!exists) {
            fileList.value.push({
                path,
                status: 'pending',
                mediaInfo,
            });

            // 如果是第一个文件，设置为当前文件
            if (fileList.value.length === 1) {
                currentIndex.value = 0;
            }
        }
    }

    /**
     * 批量添加文件
     */
    function addFiles(paths: string[]): void {
        paths.forEach(path => addFile(path));
    }

    /**
     * 移除文件
     */
    function removeFile(index: number): void {
        if (index < 0 || index >= fileList.value.length) {
            return;
        }

        fileList.value.splice(index, 1);

        // 调整当前索引
        if (fileList.value.length === 0) {
            currentIndex.value = -1;
        } else if (index === currentIndex.value) {
            currentIndex.value = Math.min(currentIndex.value, fileList.value.length - 1);
        } else if (index < currentIndex.value) {
            currentIndex.value--;
        }
    }

    /**
     * 清空所有文件
     */
    function clearAll(): void {
        fileList.value = [];
        currentIndex.value = -1;
    }

    /**
     * 更新文件状态
     */
    function updateFileStatus(
        index: number,
        status: FileItem['status'],
        error?: string
    ): void {
        if (index >= 0 && index < fileList.value.length) {
            fileList.value[index].status = status;
            if (error) {
                fileList.value[index].error = error;
            }
        }
    }

    /**
     * 更新文件媒体信息
     */
    function updateFileMediaInfo(index: number, mediaInfo: MediaInfo): void {
        if (index >= 0 && index < fileList.value.length) {
            fileList.value[index].mediaInfo = mediaInfo;
        }
    }

    /**
     * 设置当前文件
     */
    function setCurrentIndex(index: number): void {
        if (index >= -1 && index < fileList.value.length) {
            currentIndex.value = index;
        }
    }

    /**
     * 查找文件索引
     */
    function findFileIndex(path: string): number {
        return fileList.value.findIndex(f => f.path === path);
    }

    /**
     * 获取文件名
     */
    function getFileName(path: string): string {
        const parts = path.split(/[\\\/]/);
        return parts[parts.length - 1];
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

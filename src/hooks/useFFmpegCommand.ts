/**
 * FFmpeg 命令执行 Hook
 * 封装命令构建、执行、事件监听等逻辑
 */
import { ref, Ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { buildFFmpegCommand, FFmpegCommandOptions } from '@/utils/ffmpegCommandBuilder';

export interface UseFFmpegCommandOptions {
    onProgress?: (data: any) => void;
    onFinish?: (message: string) => void;
    onError?: (error: string) => void;
}

export function useFFmpegCommand(options: UseFFmpegCommandOptions = {}) {
    const isExecuting = ref(false);
    const currentCommand = ref('');
    const unlistenFunctions: UnlistenFn[] = [];

    /**
     * 执行 FFmpeg 命令
     */
    async function execute(commandOptions: FFmpegCommandOptions): Promise<void> {
        if (isExecuting.value) {
            throw new Error('命令正在执行中');
        }

        // 构建命令
        const command = buildFFmpegCommand(commandOptions);
        currentCommand.value = command;
        isExecuting.value = true;

        try {
            // 设置事件监听
            await setupListeners();

            // 执行命令
            await invoke('execute_ffmpeg_command', { command });
        } catch (error) {
            isExecuting.value = false;
            cleanup();
            throw error;
        }
    }

    /**
     * 执行原始命令字符串
     */
    async function executeRaw(command: string): Promise<void> {
        if (isExecuting.value) {
            throw new Error('命令正在执行中');
        }

        currentCommand.value = command;
        isExecuting.value = true;

        try {
            await setupListeners();
            await invoke('execute_ffmpeg_command', { command });
        } catch (error) {
            isExecuting.value = false;
            cleanup();
            throw error;
        }
    }

    /**
     * 停止执行
     */
    async function stop(): Promise<void> {
        if (!isExecuting.value) {
            return;
        }

        try {
            await invoke('stop_convert');
            isExecuting.value = false;
            cleanup();
        } catch (error) {
            console.error('停止命令失败:', error);
            throw error;
        }
    }

    /**
     * 设置事件监听
     */
    async function setupListeners(): Promise<void> {
        // 进度事件
        const progressUnlisten = await listen('progress', (event: any) => {
            options.onProgress?.(event.payload);
        });
        unlistenFunctions.push(progressUnlisten);

        // 完成事件
        const finishUnlisten = await listen('finish', (event: any) => {
            isExecuting.value = false;
            options.onFinish?.(event.payload);
            cleanup();
        });
        unlistenFunctions.push(finishUnlisten);

        // 错误事件
        const errorUnlisten = await listen('error', (event: any) => {
            isExecuting.value = false;
            options.onError?.(event.payload);
            cleanup();
        });
        unlistenFunctions.push(errorUnlisten);
    }

    /**
     * 清理监听器
     */
    function cleanup(): void {
        unlistenFunctions.forEach(fn => fn());
        unlistenFunctions.length = 0;
    }

    return {
        isExecuting,
        currentCommand,
        execute,
        executeRaw,
        stop,
        cleanup,
    };
}

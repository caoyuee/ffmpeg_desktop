import { defineStore } from 'pinia'
export const useSettingStore = defineStore('setting_info', {
    state: () => ({
        theme: 'light', // 新增主题状态
        language: 'zh-CN', // 新增语言状态
    }),
    actions: {
        // 更新主题
        updateTheme(theme: string) {
            this.theme = theme;
            localStorage.setItem('theme', theme);
            document.documentElement.className = theme;
        },
        // 更新语言
        updateLanguage(language: string) {
            this.language = language;
            localStorage.setItem('language', language);
        },
    },
})

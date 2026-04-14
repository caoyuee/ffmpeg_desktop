import { createI18n } from "vue-i18n";
import type { I18n } from "vue-i18n";
import zhCN from "./locales/zh-CN";
import enUS from "./locales/en-US";

export type MessageSchema = typeof zhCN;

export type LanguageCode = "zh-CN" | "en-US";

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export const availableLanguages: LanguageOption[] = [
  { code: "zh-CN", name: "Simplified Chinese", nativeName: "简体中文" },
  { code: "en-US", name: "English", nativeName: "English" },
];

const savedLocale = localStorage.getItem("language") as LanguageCode | null;
const browserLocale = navigator.language as LanguageCode;
const defaultLocale: LanguageCode =
  savedLocale || (browserLocale.startsWith("zh") ? "zh-CN" : "en-US");

const i18n = createI18n<[MessageSchema], LanguageCode>({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: "en-US",
  messages: {
    "zh-CN": zhCN,
    "en-US": enUS,
  },
  missingWarn: false,
  fallbackWarn: false,
});

export function setLocale(locale: LanguageCode): void {
  if (i18n.mode === "legacy") {
    i18n.global.locale = locale;
  } else {
    (i18n.global.locale as unknown as { value: LanguageCode }).value = locale;
  }
  localStorage.setItem("language", locale);
  document.documentElement.lang = locale;
}

export function getLocale(): LanguageCode {
  if (i18n.mode === "legacy") {
    return i18n.global.locale as LanguageCode;
  }
  return (i18n.global.locale as unknown as { value: LanguageCode }).value;
}

export function getLanguageName(code: LanguageCode): string {
  const lang = availableLanguages.find((l) => l.code === code);
  return lang ? lang.nativeName : code;
}

export default i18n;

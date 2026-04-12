import { defineStore } from "pinia";
export const useLogsStore = defineStore("logs_info", {
  state: () => ({
    logsList: [] as string[],
  }),
  actions: {
    PushLog(log: string) {
      this.logsList.push(log);
    },
    InitLogs() {
      this.logsList = [];
    },
    EditLog(index: number, log: string) {
      this.logsList[index] = log;
    },
    clearLogs() {
      this.logsList = [];
    },
  },
});

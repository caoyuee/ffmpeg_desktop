use once_cell::sync::Lazy;
use std::sync::Mutex;
use tauri::AppHandle;

use crate::modules;

static INDEPENDENT_PANEL_FILES: Lazy<Mutex<Vec<String>>> = Lazy::new(|| Mutex::new(Vec::new()));

#[tauri::command]
pub fn open_independent_panel(app: AppHandle, files: Vec<String>) -> Result<(), String> {
    let mut stored = INDEPENDENT_PANEL_FILES.lock().unwrap();
    *stored = files;

    let file_count = stored.len();
    drop(stored);

    modules::windows::open_or_focus_window(
        &app,
        "independent-panel",
        &format!("为 {} 个文件使用单独的参数方案", file_count),
        "/independent-panel",
        (1100.0, 700.0),
    );
    Ok(())
}

#[tauri::command]
pub fn get_independent_panel_files() -> Vec<String> {
    INDEPENDENT_PANEL_FILES.lock().unwrap().clone()
}

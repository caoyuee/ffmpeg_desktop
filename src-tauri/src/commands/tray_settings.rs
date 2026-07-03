use once_cell::sync::Lazy;
use std::sync::Mutex;

struct TraySettings {
    minimize_to_tray: bool,
    close_to_tray: bool,
}

static TRAY_SETTINGS: Lazy<Mutex<TraySettings>> = Lazy::new(|| {
    Mutex::new(TraySettings {
        minimize_to_tray: false,
        close_to_tray: false,
    })
});

#[tauri::command]
pub fn set_tray_settings(minimize_to_tray: bool, close_to_tray: bool) {
    let mut settings = TRAY_SETTINGS.lock().unwrap();
    settings.minimize_to_tray = minimize_to_tray;
    settings.close_to_tray = close_to_tray;
}

pub(crate) fn close_to_tray_enabled() -> bool {
    TRAY_SETTINGS.lock().unwrap().close_to_tray
}

use tauri::{AppHandle, Manager, WebviewUrl};
pub fn open_or_focus_window(
    app: &AppHandle,
    window_label: &str,
    title: &str,
    route: &str,
    size: (f64, f64),
) {
    if let Some(window) = app.get_webview_window(window_label) {
        window.show().expect("Failed to show window");
        window
            .as_ref()
            .window()
            .set_focus()
            .expect("Failed to focus window");
    } else {
        let _new_window =
            tauri::WebviewWindowBuilder::new(app, window_label, WebviewUrl::App(route.into()))
                .title(title)
                .inner_size(size.0, size.1)
                .skip_taskbar(false) // 可选：新窗口的一些特定行为
                .build()
                .expect("Failed to create window");
    }
}

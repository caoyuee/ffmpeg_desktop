use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "hidden", "隐藏窗口", true, None::<&str>)?,
            &MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?,
            // &MenuItem::with_id(app, "setting", "设置", true, None::<&str>)?,
            &MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?,
        ],
    )?;
    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("ffmpeg_desktop")
        .on_menu_event(move |app, event| {
            let window = app
                .get_webview_window("main")
                .expect("Failed to get main window");
            match event.id.as_ref() {
                // "setting" => crate::modules::windows::open_or_focus_window(
                //     app,
                //     "settings",
                //     "Settings",
                //     "/#/setting",
                //     (800.0, 600.0),
                // ),
                "quit" => app.exit(0),
                "hidden" => window.hide().expect("Failed to hide window"),
                "show" => {
                    window.show().expect("Failed to show window");
                    window
                        .as_ref()
                        .window()
                        .set_focus()
                        .expect("Failed to focus window");
                }
                _ => println!("Unhandled menu item: {:?}", event.id),
            }
        })
        .icon(app.default_window_icon().unwrap().clone())
        .build(app)?;
    Ok(())
}

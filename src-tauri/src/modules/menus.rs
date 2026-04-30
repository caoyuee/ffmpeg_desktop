use tauri::{menu::MenuBuilder, AppHandle};

pub fn setup_menus(app: &AppHandle) -> tauri::Result<()> {
    // 创建菜单
    let menu = MenuBuilder::new(app).text("setting", "首选项").build()?;

    // 为应用设置菜单，但这是应用级的，会影响所有窗口
    // 如果只希望在主窗口显示菜单，我们需要其他方法
    app.set_menu(menu)?;
    // 监听菜单事件
    app.on_menu_event(|app_handle, event| {
        println!("menu event: {:?}", event.id());
        match event.id().0.as_str() {
            "setting" => {
                crate::modules::windows::open_or_focus_window(
                    app_handle,
                    "settings",
                    "Settings",
                    "/settings",
                    (960.0, 540.0),
                );
            }
            _ => {
                println!("unexpected menu event");
            }
        }
    });
    Ok(())
}

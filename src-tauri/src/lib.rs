mod commands;
mod library;
pub mod modules;
mod utility;

use commands::*;
use library::_probe::probe_media_info;
use modules::{preset_manager, task_manager};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_pinia::init())
        .setup(|app| {
            modules::tray::setup_tray(app.handle())?;

            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                use tauri::WindowEvent;
                match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        if commands::tray_settings::close_to_tray_enabled() {
                            api.prevent_close();
                            let _ = window_clone.hide();
                        }
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            execute_ffmpeg_command,
            stop_convert,
            read_json_file,
            probe_media_info,
            check_ffmpeg_tools,
            install_ffmpeg_command,
            get_system_info_app,
            check_ffmpeg_from_path,
            test_ffmpeg,
            write_concat_file,
            extract_video_frame,
            read_video_file,
            start_ffplay,
            stop_ffplay,
            toggle_ffplay_pause,
            set_ffplay_volume,
            seek_ffplay,
            get_system_metrics,
            get_ffmpeg_processes,
            kill_process_by_pid,
            delete_file,
            preserve_file_times,
            task_manager::start_ffmpeg,
            task_manager::pause_process,
            task_manager::resume_process,
            task_manager::stop_process,
            task_manager::send_ffmpeg_stdin,
            preset_manager::load_presets,
            preset_manager::save_preset,
            preset_manager::delete_preset,
            preset_manager::export_preset,
            preset_manager::import_preset,
            set_tray_settings,
            open_independent_panel,
            get_independent_panel_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

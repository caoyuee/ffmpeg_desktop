pub mod exe_path;
pub mod ffmpeg_tools;
pub mod ffplay;
pub mod file_commands;
pub mod independent_panel;
pub mod performance;
pub mod startup_args;
pub mod tray_settings;
pub mod video_preview;

pub use exe_path::get_executable_path;
pub use ffmpeg_tools::{
    check_ffmpeg_from_path, check_ffmpeg_tools, detect_hardware_acceleration, get_system_info_app,
    install_ffmpeg_command, test_ffmpeg,
};
pub use ffplay::{seek_ffplay, set_ffplay_volume, start_ffplay, stop_ffplay, toggle_ffplay_pause};
pub use file_commands::{
    delete_file, get_file_sizes, list_media_files, preserve_file_times, read_json_file,
    read_video_file, write_concat_file,
};
pub use independent_panel::{get_independent_panel_files, open_independent_panel};
pub use performance::{get_ffmpeg_processes, get_system_metrics, kill_process_by_pid};
// P0-1 / R1-1：命令必须在 mod.rs 导出，否则 lib.rs 的 generate_handler! 找不到符号。
pub use startup_args::parse_startup_args;
pub use tray_settings::set_tray_settings;
pub use video_preview::extract_video_frame;

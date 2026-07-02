mod library;
pub mod modules;
mod utility;
use std::sync::Mutex;
use std::env;

use tauri::{AppHandle, Manager, Window};

use once_cell::sync::Lazy;

use library::{
    _ffmpeg,
    _file::read_file,
    _probe::probe_media_info,
    _process::kill_process,
};
use utility::_executor::execute_ffmpeg;
use modules::task_manager;
use modules::preset_manager;

static GLOBAL_PID: Lazy<Mutex<Option<u32>>> = Lazy::new(|| Mutex::new(None));

static INDEPENDENT_PANEL_FILES: Lazy<Mutex<Vec<String>>> = Lazy::new(|| Mutex::new(Vec::new()));

#[tauri::command]
fn open_independent_panel(app: AppHandle, files: Vec<String>) -> Result<(), String> {
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
fn get_independent_panel_files() -> Vec<String> {
    INDEPENDENT_PANEL_FILES.lock().unwrap().clone()
}

struct TraySettings {
    minimize_to_tray: bool,
    close_to_tray: bool,
}

static TRAY_SETTINGS: Lazy<Mutex<TraySettings>> = Lazy::new(|| Mutex::new(TraySettings {
    minimize_to_tray: false,
    close_to_tray: false,
}));

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(&path).map_err(|e| format!("删除文件失败: {}", e))
}

#[tauri::command]
fn preserve_file_times(
    source: String,
    dest: String,
    preserve_creation: bool,
    preserve_modification: bool,
    preserve_access: bool,
) -> Result<(), String> {
    use std::fs;
    let src_meta = fs::metadata(&source).map_err(|e| format!("读取源文件失败: {}", e))?;

    if preserve_modification {
        let modified = filetime::FileTime::from_last_modification_time(&src_meta);
        filetime::set_file_mtime(&dest, modified)
            .map_err(|e| format!("设置修改时间失败: {}", e))?;
    }

    if preserve_access {
        let accessed = filetime::FileTime::from_last_access_time(&src_meta);
        filetime::set_file_atime(&dest, accessed)
            .map_err(|e| format!("设置访问时间失败: {}", e))?;
    }

    if preserve_creation {
        let _ = filetime::FileTime::from_creation_time(&src_meta);
    }

    Ok(())
}


/// 新的命令执行接口：接收完整的 FFmpeg 命令字符串并执行
#[tauri::command]
fn execute_ffmpeg_command(
    app: AppHandle,
    window: Window,
    command: String,
) -> Result<String, String> {
    match execute_ffmpeg(app, window, &command) {
        Ok(_) => Ok("命令已开始执行".to_string()),
        Err(e) => Err(e),
    }
}

#[tauri::command]
fn stop_convert() {
    let mut pid_opt = GLOBAL_PID.lock().unwrap();

    // pid_opt.take() 的功能是「取出 Option 內的值，並把自己設為 None」。
    if let Some(pid) = pid_opt.take() {
        kill_process(pid);
    }
}

/// 讀取JSON文件資料夾檔名列表
/// ## 參數
/// - `app`: Tauri 應用的 AppHandle
/// - `filename`: 文件名稱
/// ## 返回
/// - `String`: 成功時返回記錄的 JSON 字符串，失敗
#[tauri::command]
fn read_json_file(app: AppHandle, filename: &str) -> Result<String, String> {
    read_file(app, "config", filename)
}

#[tauri::command]
fn check_ffmpeg_tools() -> serde_json::Value {
    serde_json::json!({
        "ffmpeg": {
            "installed": _ffmpeg::check_ffmpeg_installed(),
            "path": _ffmpeg::get_ffmpeg_path().unwrap_or_else(|| "".to_string()),
            "version": _ffmpeg::get_ffmpeg_version().unwrap_or_else(|| "".to_string()),
        },
        "ffprobe": {
            "installed": _ffmpeg::check_ffprobe_installed(),
            "path": _ffmpeg::get_ffprobe_path().unwrap_or_else(|| "".to_string()),
            "version": _ffmpeg::get_ffprobe_version().unwrap_or_else(|| "".to_string()),
        },
        "ffplay": {
            "installed": _ffmpeg::check_ffplay_installed(),
            "path": _ffmpeg::get_ffplay_path().unwrap_or_else(|| "".to_string()),
            "version": _ffmpeg::get_ffplay_version().unwrap_or_else(|| "".to_string()),
        },
    })
}

#[tauri::command]
async fn install_ffmpeg_command(app: AppHandle) -> Result<String, String> {
    _ffmpeg::install_ffmpeg(app).await
}

#[tauri::command]
fn get_system_info_app() -> serde_json::Value {
    _ffmpeg::get_system_info()
}

#[tauri::command]
fn check_ffmpeg_from_path(path: &str) -> serde_json::Value {
    use std::path::Path;
    use std::process::Command;

    let is_valid = if Path::new(path).exists() {
        // 如果是完整路径，尝试运行它
        match Command::new(path).arg("-version").output() {
            Ok(_) => true,
            Err(_) => false,
        }
    } else {
        // 如果只是命令名，尝试直接运行
        match Command::new(path).arg("-version").output() {
            Ok(_) => true,
            Err(_) => false,
        }
    };

    serde_json::json!({
        "valid": is_valid,
        "path": path
    })
}

#[tauri::command]
fn test_ffmpeg(path: String) -> Result<String, String> {
    use std::process::Command;
    
    let ffmpeg_path = if path.is_empty() {
        "ffmpeg".to_string()
    } else {
        path
    };
    
    match Command::new(&ffmpeg_path).arg("-version").output() {
        Ok(output) => {
            if output.status.success() {
                let version_info = String::from_utf8_lossy(&output.stdout);
                let first_line = version_info.lines().next().unwrap_or("FFmpeg 可用");
                Ok(first_line.to_string())
            } else {
                Err("FFmpeg 执行失败".to_string())
            }
        }
        Err(e) => Err(format!("未找到 FFmpeg: {}", e)),
    }
}

#[tauri::command]
fn write_concat_file(app: AppHandle, content: String) -> Result<String, String> {
    use std::io::Write;
    use std::fs::File;
    
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    
    let concat_file_path = app_data_dir.join("ffmpeg_concat_demuxer.txt");
    
    let mut file = File::create(&concat_file_path)
        .map_err(|e| format!("Failed to create concat file: {}", e))?;
    
    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write concat file: {}", e))?;
    
    Ok(concat_file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn extract_video_frame(video_path: String, timestamp: String) -> Result<String, String> {
    use std::process::Command;
    use base64::{Engine as _, engine::general_purpose};
    use std::path::PathBuf;

    const ALLOWED_VIDEO_EXTENSIONS: &[&str] = &[
        "mp4", "mkv", "avi", "mov", "webm", "wmv", "flv", "m4v", "mpg", "mpeg", "ts", "mts", "m2ts"
    ];

    fn validate_video_path(path: &str) -> Result<PathBuf, String> {
        let path = PathBuf::from(path);
        
        if !path.exists() {
            return Err("文件不存在".to_string());
        }

        let canonical_path = path.canonicalize()
            .map_err(|e| format!("无法解析文件路径: {}", e))?;
        
        let ext = canonical_path.extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        
        if !ALLOWED_VIDEO_EXTENSIONS.contains(&ext.as_str()) {
            return Err(format!("不支持的视频文件格式: {}", ext));
        }
        
        Ok(canonical_path)
    }

    let validated_path = validate_video_path(&video_path)?;
    
    let temp_dir = std::env::temp_dir();
    let output_path = temp_dir.join("crop_preview_frame.png");
    
    let status = Command::new("ffmpeg")
        .args(&[
            "-ss", &timestamp,
            "-i", &validated_path.to_string_lossy().to_string(),
            "-frames:v", "1",
            "-q:v", "1",
            &output_path.to_string_lossy().to_string(),
            "-y"
        ])
        .status()
        .map_err(|e| format!("Failed to extract frame: {}", e))?;
    
    if !status.success() {
        return Err("Failed to extract video frame".to_string());
    }
    
    let image_data = std::fs::read(&output_path)
        .map_err(|e| format!("Failed to read frame: {}", e))?;
    
    let base64_data = general_purpose::STANDARD.encode(&image_data);
    
    let _ = std::fs::remove_file(&output_path);
    
    Ok(base64_data)
}

#[tauri::command]
fn read_video_file(path: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};
    
    let data = std::fs::read(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    Ok(general_purpose::STANDARD.encode(&data))
}

static FFPLAY_PROCESS: Lazy<Mutex<Option<std::process::Child>>> = Lazy::new(|| Mutex::new(None));

#[tauri::command]
fn start_ffplay(file_path: String, width: u32, height: u32, volume: u32) -> Result<(), String> {
    use std::process::{Command, Stdio};
    
    let ffplay = Command::new("ffplay")
        .args(&[
            "-x", &width.to_string(),
            "-y", &height.to_string(),
            "-noborder",
            "-volume", &volume.to_string(),
            &file_path,
        ])
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start ffplay: {}", e))?;
    
    let mut process = FFPLAY_PROCESS.lock().unwrap();
    *process = Some(ffplay);
    
    Ok(())
}

#[tauri::command]
fn stop_ffplay() {
    let mut process = FFPLAY_PROCESS.lock().unwrap();
    if let Some(ref mut child) = *process {
        let _ = child.kill();
        let _ = child.wait();
    }
    *process = None;
}

#[tauri::command]
fn toggle_ffplay_pause() {
    use std::io::Write;
    let mut process = FFPLAY_PROCESS.lock().unwrap();
    if let Some(ref mut child) = *process {
        if let Some(ref mut stdin) = child.stdin {
            let _ = stdin.write_all(b" ");
            let _ = stdin.flush();
        }
    }
}

#[tauri::command]
fn set_ffplay_volume(volume: u32) {
    use std::io::Write;
    let mut process = FFPLAY_PROCESS.lock().unwrap();
    if let Some(ref mut child) = *process {
        if let Some(ref mut stdin) = child.stdin {
            let _ = writeln!(stdin, "volume {}", volume);
            let _ = stdin.flush();
        }
    }
}

#[tauri::command]
fn seek_ffplay(time: f64) {
    use std::io::Write;
    let mut process = FFPLAY_PROCESS.lock().unwrap();
    if let Some(ref mut child) = *process {
        if let Some(ref mut stdin) = child.stdin {
            let _ = writeln!(stdin, "seek {}", time);
            let _ = stdin.flush();
        }
    }
}



#[derive(Default)]
struct DiskIoSnapshot {
    read_sectors: u64,
    write_sectors: u64,
    timestamp: Option<std::time::Instant>,
}

static DISK_IO_SNAPSHOT: Lazy<Mutex<DiskIoSnapshot>> = Lazy::new(|| Mutex::new(DiskIoSnapshot::default()));

fn get_disk_io() -> (f64, f64) {
    #[cfg(target_os = "linux")]
    {
        let mut current_read: u64 = 0;
        let mut current_write: u64 = 0;

        if let Ok(content) = std::fs::read_to_string("/proc/diskstats") {
            for line in content.lines() {
                let fields: Vec<&str> = line.split_whitespace().collect();
                if fields.len() >= 14 {
                    // field 2: device name, field 5: sectors read, field 9: sectors written
                    if let (Ok(read), Ok(write)) = (fields[5].parse::<u64>(), fields[9].parse::<u64>()) {
                        current_read += read;
                        current_write += write;
                    }
                }
            }
        }

        let mut snapshot = DISK_IO_SNAPSHOT.lock().unwrap();
        let now = std::time::Instant::now();

        // sector = 512 bytes
        let read_speed = if let Some(prev_time) = snapshot.timestamp {
            let elapsed = now.duration_since(prev_time).as_secs_f64();
            if elapsed > 0.0 && current_read >= snapshot.read_sectors {
                ((current_read - snapshot.read_sectors) as f64 * 512.0) / (elapsed * 1_048_576.0)
            } else {
                0.0
            }
        } else {
            0.0
        };

        let write_speed = if let Some(prev_time) = snapshot.timestamp {
            let elapsed = now.duration_since(prev_time).as_secs_f64();
            if elapsed > 0.0 && current_write >= snapshot.write_sectors {
                ((current_write - snapshot.write_sectors) as f64 * 512.0) / (elapsed * 1_048_576.0)
            } else {
                0.0
            }
        } else {
            0.0
        };

        snapshot.read_sectors = current_read;
        snapshot.write_sectors = current_write;
        snapshot.timestamp = Some(now);

        ((read_speed * 10.0).round() / 10.0, (write_speed * 10.0).round() / 10.0)
    }

    #[cfg(not(target_os = "linux"))]
    {
        (0.0, 0.0)
    }
}

#[tauri::command]
fn get_system_metrics() -> serde_json::Value {
    use sysinfo::System;

    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_usage = sys.global_cpu_usage();
    let cpu_cores = sys.cpus().len();

    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let memory_percent = if total_memory > 0 {
        (used_memory as f64 / total_memory as f64) * 100.0
    } else {
        0.0
    };

    let (read_speed, write_speed) = get_disk_io();

    serde_json::json!({
        "cpu": {
            "usage": cpu_usage,
            "cores": cpu_cores,
            "temperature": null
        },
        "memory": {
            "total": total_memory,
            "used": used_memory,
            "usedPercent": memory_percent
        },
        "gpu": {
            "usage": 0.0,
            "memoryTotal": 0,
            "memoryUsed": 0,
            "temperature": null
        },
        "disk": {
            "readSpeed": read_speed,
            "writeSpeed": write_speed
        }
    })
}

#[tauri::command]
fn get_ffmpeg_processes() -> Vec<serde_json::Value> {
    use sysinfo::{System, ProcessStatus};
    use std::collections::HashSet;
    
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let thread_pids: HashSet<sysinfo::Pid> = sys.processes()
        .values()
        .filter_map(|p| p.tasks())
        .flatten()
        .copied()
        .collect();
    
    let processes: Vec<serde_json::Value> = sys.processes()
        .iter()
        .filter(|(pid, process)| {
            let name = process.name().to_string_lossy().to_lowercase();
            let is_ffmpeg = name.contains("ffmpeg") || name.contains("ffprobe");
            let is_main = !thread_pids.contains(pid);
            let is_alive = !matches!(process.status(), ProcessStatus::Zombie | ProcessStatus::Dead);
            is_ffmpeg && is_main && is_alive
        })
        .map(|(pid, process)| {
            serde_json::json!({
                "pid": pid.as_u32(),
                "name": process.name().to_string_lossy(),
                "cpu": process.cpu_usage() as f64,
                "memory": process.memory()
            })
        })
        .collect();
    
    processes
}

#[tauri::command]
fn kill_process_by_pid(pid: u32) -> Result<(), String> {
    use sysinfo::{System, Pid};
    
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let pid = Pid::from_u32(pid);
    if let Some(process) = sys.process(pid) {
        process.kill();
        Ok(())
    } else {
        Err(format!("Process {} not found", pid))
    }
}

#[allow(dead_code)]
#[tauri::command]
fn get_startup_args() -> Vec<String> {
    env::args().collect()
}

#[allow(dead_code)]
#[tauri::command]
fn parse_startup_args() -> serde_json::Value {
    let args: Vec<String> = env::args().collect();
    let mut result = serde_json::Map::new();
    
    let mut i = 0;
    while i < args.len() {
        let arg = &args[i];
        
        if arg == "-i" && i + 1 < args.len() {
            result.insert("input_file".to_string(), serde_json::json!(args[i + 1]));
            i += 2;
        } else if arg == "-3fui_file" && i + 1 < args.len() {
            result.insert("preset_file".to_string(), serde_json::json!(args[i + 1]));
            i += 2;
        } else if arg == "-3fuiVideoHelperInPointTime" && i + 1 < args.len() {
            result.insert("trim_start".to_string(), serde_json::json!(args[i + 1]));
            i += 2;
        } else if arg == "-3fuiVideoHelperOutPointTime" && i + 1 < args.len() {
            result.insert("trim_end".to_string(), serde_json::json!(args[i + 1]));
            i += 2;
        } else if arg == "-ffmpeg" {
            let ffmpeg_args: Vec<String> = args[i + 1..].to_vec();
            result.insert("ffmpeg_args".to_string(), serde_json::json!(ffmpeg_args));
            break;
        } else {
            i += 1;
        }
    }
    
    serde_json::json!(result)
}

#[tauri::command]
fn set_tray_settings(minimize_to_tray: bool, close_to_tray: bool) {
    let mut settings = TRAY_SETTINGS.lock().unwrap();
    settings.minimize_to_tray = minimize_to_tray;
    settings.close_to_tray = close_to_tray;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_pinia::init())
        .setup(|app| {
            modules::tray::setup_tray(app.handle())?;

            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                use tauri::WindowEvent;
                match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        let settings = TRAY_SETTINGS.lock().unwrap();
                        if settings.close_to_tray {
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

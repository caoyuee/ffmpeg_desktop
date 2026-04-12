use std::collections::HashMap;
use std::sync::Mutex;
use std::process::{Child, Command, Stdio};
use std::io::{BufRead, BufReader};
use tauri::{AppHandle, Emitter, Manager};
use once_cell::sync::Lazy;

static TASK_PROCESSES: Lazy<Mutex<HashMap<String, u32>>> = Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TaskInfo {
    pub id: String,
    pub input_file: String,
    pub output_file: String,
    pub command_line: String,
    pub status: String,
}

#[tauri::command]
pub fn start_ffmpeg(
    app: AppHandle,
    command: String,
    task_id: String,
) -> Result<u32, String> {
    let parts = shell_words::split(&command)
        .map_err(|e| format!("Failed to parse command: {}", e))?;
    
    if parts.is_empty() {
        return Err("Empty command".to_string());
    }

    let program = &parts[0];
    let args = &parts[1..];

    let mut child = Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start FFmpeg: {}", e))?;

    let pid = child.id();
    
    TASK_PROCESSES.lock().unwrap().insert(task_id.clone(), pid);

    let task_id_clone = task_id.clone();
    let app_clone = app.clone();
    
    std::thread::spawn(move || {
        if let Some(stderr) = child.stderr.take() {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    if let Ok(progress) = parse_progress(&line) {
                        let _ = app_clone.emit("ffmpeg-progress", serde_json::json!({
                            "taskId": task_id_clone,
                            "progress": progress
                        }));
                    }
                }
            }
        }

        let status = child.wait();
        let exit_code = status.map(|s| s.code().unwrap_or(-1)).unwrap_or(-1);
        
        TASK_PROCESSES.lock().unwrap().remove(&task_id_clone);
        
        let _ = app_clone.emit("ffmpeg-finish", serde_json::json!({
            "taskId": task_id_clone,
            "exitCode": exit_code
        }));
    });

    Ok(pid)
}

#[tauri::command]
pub fn pause_process(pid: u32) -> Result<(), String> {
    #[cfg(unix)]
    {
        use nix::sys::signal::{kill, Signal};
        use nix::unistd::Pid;
        
        kill(Pid::from_raw(pid as i32), Signal::SIGSTOP)
            .map_err(|e| format!("Failed to pause process: {}", e))?;
    }
    
    #[cfg(windows)]
    {
        return Err("Windows pause not implemented".to_string());
    }
    
    Ok(())
}

#[tauri::command]
pub fn resume_process(pid: u32) -> Result<(), String> {
    #[cfg(unix)]
    {
        use nix::sys::signal::{kill, Signal};
        use nix::unistd::Pid;
        
        kill(Pid::from_raw(pid as i32), Signal::SIGCONT)
            .map_err(|e| format!("Failed to resume process: {}", e))?;
    }
    
    #[cfg(windows)]
    {
        return Err("Windows resume not implemented".to_string());
    }
    
    Ok(())
}

#[tauri::command]
pub fn stop_process(pid: u32) -> Result<(), String> {
    #[cfg(unix)]
    {
        use nix::sys::signal::{kill, Signal};
        use nix::unistd::Pid;
        
        kill(Pid::from_raw(pid as i32), Signal::SIGTERM)
            .map_err(|e| format!("Failed to stop process: {}", e))?;
    }
    
    #[cfg(windows)]
    {
        use std::process::Command;
        
        Command::new("taskkill")
            .args(&["/PID", &pid.to_string(), "/F"])
            .spawn()
            .map_err(|e| format!("Failed to stop process: {}", e))?;
    }
    
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize)]
struct ProgressInfo {
    frame: Option<u64>,
    fps: Option<f64>,
    time: Option<String>,
    bitrate: Option<String>,
    speed: Option<String>,
    size: Option<String>,
}

fn parse_progress(line: &str) -> Result<ProgressInfo, ()> {
    let mut progress = ProgressInfo {
        frame: None,
        fps: None,
        time: None,
        bitrate: None,
        speed: None,
        size: None,
    };

    let frame_re = regex::Regex::new(r"frame=\s*(\d+)").unwrap();
    let fps_re = regex::Regex::new(r"fps=\s*([\d\.]+)").unwrap();
    let time_re = regex::Regex::new(r"time=\s*(\d+:\d{2}:\d{2}\.\d{2})").unwrap();
    let bitrate_re = regex::Regex::new(r"bitrate=\s*([\d\.]+)\s*kbits/s").unwrap();
    let speed_re = regex::Regex::new(r"speed=\s*([\d\.eE\+\-]+)\s*x").unwrap();
    let size_re = regex::Regex::new(r"size=\s*(\d+)\s*([KMG]iB)").unwrap();

    if let Some(caps) = frame_re.captures(line) {
        progress.frame = caps[1].parse().ok();
    }
    
    if let Some(caps) = fps_re.captures(line) {
        progress.fps = caps[1].parse().ok();
    }
    
    if let Some(caps) = time_re.captures(line) {
        progress.time = Some(caps[1].to_string());
    }
    
    if let Some(caps) = bitrate_re.captures(line) {
        progress.bitrate = Some(format!("{} kbps", &caps[1]));
    }
    
    if let Some(caps) = speed_re.captures(line) {
        progress.speed = Some(format!("{}x", &caps[1]));
    }
    
    if let Some(caps) = size_re.captures(line) {
        progress.size = Some(format!("{}{}", &caps[1], &caps[2]));
    }

    if progress.frame.is_some() || progress.fps.is_some() || progress.time.is_some() {
        Ok(progress)
    } else {
        Err(())
    }
}

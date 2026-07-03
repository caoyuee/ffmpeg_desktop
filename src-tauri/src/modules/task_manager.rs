use std::collections::HashMap;
use std::sync::Mutex;
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use tauri::{AppHandle, Emitter};
use once_cell::sync::Lazy;
use regex::Regex;

const EXIT_CODE_ERROR: i32 = -1;

struct TaskProcess {
    _pid: u32,
}

static TASK_PROCESSES: Lazy<Mutex<HashMap<String, TaskProcess>>> = Lazy::new(|| Mutex::new(HashMap::new()));
static TASK_STDINS: Lazy<Mutex<HashMap<String, std::process::ChildStdin>>> = Lazy::new(|| Mutex::new(HashMap::new()));

static FRAME_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"frame=\s*(\d+)").unwrap()
});

static FPS_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"fps=\s*([\d\.]+)").unwrap()
});

static TIME_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"time=\s*(\d+:\d{2}:\d{2}\.\d{2})").unwrap()
});

static BITRATE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"bitrate=\s*([\d\.]+)\s*kbits/s").unwrap()
});

static SPEED_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"speed=\s*([\d\.eE\+\-]+)\s*x").unwrap()
});

static SIZE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"size=\s*(\d+)\s*([KMG]iB)").unwrap()
});

static ERROR_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)(Error|Invalid|cannot find|failed|No such file|Permission denied|not found|not recognized|unrecognized|Unknown|missing)").unwrap()
});

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
    cpu_affinity: Option<String>,
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

    let stdin = child.stdin.take();
    if let Some(stdin) = stdin {
        TASK_STDINS.lock().unwrap().insert(task_id.clone(), stdin);
    }

    TASK_PROCESSES.lock().unwrap().insert(task_id.clone(), TaskProcess { _pid: pid });

    if let Some(ref affinity_str) = cpu_affinity {
        #[cfg(unix)]
        {
            use nix::unistd::Pid;
            use nix::sched::{CpuSet, sched_setaffinity};
            let mut cpuset = CpuSet::new();
            for s in affinity_str.split(',') {
                if let Ok(core) = s.trim().parse::<usize>() {
                    cpuset.set(core).ok();
                }
            }
            let _ = sched_setaffinity(Pid::from_raw(pid as i32), &cpuset);
        }
    }

    let task_id_clone = task_id.clone();
    let app_clone = app.clone();
    
    std::thread::spawn(move || {
        let exit_code = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            if let Some(stderr) = child.stderr.take() {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                     if let Ok(line) = line {
                        if ERROR_RE.is_match(&line) {
                            let _ = app_clone.emit("ffmpeg-log", serde_json::json!({
                                "taskId": task_id_clone,
                                "level": "error",
                                "message": line
                            }));
                        }
                        if let Ok(progress) = parse_progress(&line) {
                            let _ = app_clone.emit("ffmpeg-progress", serde_json::json!({
                                "taskId": task_id_clone,
                                "progress": progress
                            }));
                        }
                    }
                }
            }

            child.wait()
                .map(|s| s.code().unwrap_or(EXIT_CODE_ERROR))
                .unwrap_or(EXIT_CODE_ERROR)
        })).unwrap_or(EXIT_CODE_ERROR);
        
        TASK_PROCESSES.lock().unwrap().remove(&task_id_clone);
        TASK_STDINS.lock().unwrap().remove(&task_id_clone);
        
        if exit_code == 0 {
            let _ = app_clone.emit("ffmpeg-finish", serde_json::json!({
                "taskId": task_id_clone,
                "exitCode": exit_code
            }));
        } else {
            let _ = app_clone.emit("ffmpeg-error", serde_json::json!({
                "taskId": task_id_clone,
                "exitCode": exit_code,
                "message": format!("FFmpeg exited with code {}", exit_code)
            }));
        }
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
        suspend_windows_process(pid)?;
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
        resume_windows_process(pid)?;
    }

    Ok(())
}

#[cfg(windows)]
fn suspend_windows_process(pid: u32) -> Result<(), String> {
    #[link(name = "ntdll")]
    extern "system" {
        fn NtSuspendProcess(process_handle: *mut std::ffi::c_void) -> i32;
    }
    #[link(name = "kernel32")]
    extern "system" {
        fn OpenProcess(dwDesiredAccess: u32, bInheritHandle: i32, dwProcessId: u32) -> *mut std::ffi::c_void;
        fn CloseHandle(hObject: *mut std::ffi::c_void) -> i32;
    }

    const PROCESS_SUSPEND_RESUME: u32 = 0x0800;

    let handle = unsafe { OpenProcess(PROCESS_SUSPEND_RESUME, 0, pid) };
    if handle.is_null() {
        return Err(format!("Failed to open process {}: access denied or not found", pid));
    }

    let status = unsafe { NtSuspendProcess(handle) };
    unsafe { CloseHandle(handle); }

    if status != 0 {
        return Err(format!("NtSuspendProcess failed with status 0x{:X}", status));
    }

    Ok(())
}

#[cfg(windows)]
fn resume_windows_process(pid: u32) -> Result<(), String> {
    #[link(name = "ntdll")]
    extern "system" {
        fn NtResumeProcess(process_handle: *mut std::ffi::c_void) -> i32;
    }
    #[link(name = "kernel32")]
    extern "system" {
        fn OpenProcess(dwDesiredAccess: u32, bInheritHandle: i32, dwProcessId: u32) -> *mut std::ffi::c_void;
        fn CloseHandle(hObject: *mut std::ffi::c_void) -> i32;
    }

    const PROCESS_SUSPEND_RESUME: u32 = 0x0800;

    let handle = unsafe { OpenProcess(PROCESS_SUSPEND_RESUME, 0, pid) };
    if handle.is_null() {
        return Err(format!("Failed to open process {}: access denied or not found", pid));
    }

    let status = unsafe { NtResumeProcess(handle) };
    unsafe { CloseHandle(handle); }

    if status != 0 {
        return Err(format!("NtResumeProcess failed with status 0x{:X}", status));
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

    if let Some(caps) = FRAME_RE.captures(line) {
        progress.frame = caps[1].parse().ok();
    }
    
    if let Some(caps) = FPS_RE.captures(line) {
        progress.fps = caps[1].parse().ok();
    }
    
    if let Some(caps) = TIME_RE.captures(line) {
        progress.time = Some(caps[1].to_string());
    }
    
    if let Some(caps) = BITRATE_RE.captures(line) {
        progress.bitrate = Some(format!("{} kbps", &caps[1]));
    }
    
    if let Some(caps) = SPEED_RE.captures(line) {
        progress.speed = Some(format!("{}x", &caps[1]));
    }
    
    if let Some(caps) = SIZE_RE.captures(line) {
        progress.size = Some(format!("{}{}", &caps[1], &caps[2]));
    }

    if progress.frame.is_some() || progress.fps.is_some() || progress.time.is_some() {
        Ok(progress)
    } else {
        Err(())
    }
}

#[tauri::command]
pub fn send_ffmpeg_stdin(task_id: String, input: String) -> Result<(), String> {
    use std::io::Write;
    let mut stdins = TASK_STDINS.lock().unwrap();
    if let Some(stdin) = stdins.get_mut(&task_id) {
        stdin.write_all(input.as_bytes()).map_err(|e| format!("写入失败: {}", e))?;
        stdin.flush().map_err(|e| format!("刷新失败: {}", e))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_progress_frame() {
        let line = "frame=  123 fps= 30 q=28.0 size=  12345kB time=00:01:23.45 bitrate=1234.5kbits/s speed=1.23x";
        let result = parse_progress(line);
        
        assert!(result.is_ok());
        let progress = result.unwrap();
        assert_eq!(progress.frame, Some(123));
    }

    #[test]
    fn test_parse_progress_fps() {
        let line = "frame=  123 fps= 30.5 q=28.0 size=  12345kB time=00:01:23.45 bitrate=1234.5kbits/s speed=1.23x";
        let result = parse_progress(line);
        
        assert!(result.is_ok());
        let progress = result.unwrap();
        assert_eq!(progress.fps, Some(30.5));
    }

    #[test]
    fn test_parse_progress_time() {
        let line = "frame=  123 fps= 30 q=28.0 size=  12345kB time=00:01:23.45 bitrate=1234.5kbits/s speed=1.23x";
        let result = parse_progress(line);
        
        assert!(result.is_ok());
        let progress = result.unwrap();
        assert_eq!(progress.time, Some("00:01:23.45".to_string()));
    }

    #[test]
    fn test_parse_progress_bitrate() {
        let line = "frame=  123 fps= 30 q=28.0 size=  12345kB time=00:01:23.45 bitrate=1234.5kbits/s speed=1.23x";
        let result = parse_progress(line);
        
        assert!(result.is_ok());
        let progress = result.unwrap();
        assert_eq!(progress.bitrate, Some("1234.5 kbps".to_string()));
    }

    #[test]
    fn test_parse_progress_speed() {
        let line = "frame=  123 fps= 30 q=28.0 size=  12345kB time=00:01:23.45 bitrate=1234.5kbits/s speed=1.23x";
        let result = parse_progress(line);
        
        assert!(result.is_ok());
        let progress = result.unwrap();
        assert_eq!(progress.speed, Some("1.23x".to_string()));
    }

    #[test]
    fn test_parse_progress_size() {
        let line = "frame=  123 fps= 30 q=28.0 size=  12345KiB time=00:01:23.45 bitrate=1234.5kbits/s speed=1.23x";
        let result = parse_progress(line);
        
        assert!(result.is_ok());
        let progress = result.unwrap();
        assert_eq!(progress.size, Some("12345KiB".to_string()));
    }

    #[test]
    fn test_parse_progress_combined() {
        let line = "frame=  456 fps= 60.5 q=25.0 size=  67890KiB time=00:05:30.12 bitrate=2345.6kbits/s speed=2.5x";
        let result = parse_progress(line);
        
        assert!(result.is_ok());
        let progress = result.unwrap();
        assert_eq!(progress.frame, Some(456));
        assert_eq!(progress.fps, Some(60.5));
        assert_eq!(progress.time, Some("00:05:30.12".to_string()));
        assert_eq!(progress.bitrate, Some("2345.6 kbps".to_string()));
        assert_eq!(progress.speed, Some("2.5x".to_string()));
        assert_eq!(progress.size, Some("67890KiB".to_string()));
    }

    #[test]
    fn test_parse_progress_invalid() {
        let line = "This is not a progress line";
        let result = parse_progress(line);
        
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_progress_partial() {
        let line = "frame=  123 fps= 30";
        let result = parse_progress(line);
        
        assert!(result.is_ok());
        let progress = result.unwrap();
        assert_eq!(progress.frame, Some(123));
        assert_eq!(progress.fps, Some(30.0));
        assert_eq!(progress.time, None);
    }

    #[test]
    fn test_frame_regex() {
        let captures = FRAME_RE.captures("frame=  123");
        assert!(captures.is_some());
        assert_eq!(captures.unwrap()[1].parse::<u64>().unwrap(), 123);
    }

    #[test]
    fn test_fps_regex() {
        let captures = FPS_RE.captures("fps= 30.5");
        assert!(captures.is_some());
        assert_eq!(captures.unwrap()[1].parse::<f64>().unwrap(), 30.5);
    }

    #[test]
    fn test_time_regex() {
        let captures = TIME_RE.captures("time=00:01:23.45");
        assert!(captures.is_some());
        assert_eq!(&captures.unwrap()[1], "00:01:23.45");
    }

    #[test]
    fn test_bitrate_regex() {
        let captures = BITRATE_RE.captures("bitrate=1234.5kbits/s");
        assert!(captures.is_some());
        assert_eq!(&captures.unwrap()[1], "1234.5");
    }

    #[test]
    fn test_speed_regex() {
        let captures = SPEED_RE.captures("speed=1.23x");
        assert!(captures.is_some());
        assert_eq!(&captures.unwrap()[1], "1.23");
    }

    #[test]
    fn test_size_regex() {
        let captures = SIZE_RE.captures("size=  12345KiB");
        assert!(captures.is_some());
        let caps = captures.unwrap();
        assert_eq!(&caps[1], "12345");
        assert_eq!(&caps[2], "KiB");
    }
}

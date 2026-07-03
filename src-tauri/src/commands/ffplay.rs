use once_cell::sync::Lazy;
use std::sync::Mutex;

static FFPLAY_PROCESS: Lazy<Mutex<Option<std::process::Child>>> = Lazy::new(|| Mutex::new(None));

#[tauri::command]
pub fn start_ffplay(file_path: String, width: u32, height: u32, volume: u32) -> Result<(), String> {
    use std::process::{Command, Stdio};

    let ffplay = Command::new("ffplay")
        .args(&[
            "-x",
            &width.to_string(),
            "-y",
            &height.to_string(),
            "-noborder",
            "-volume",
            &volume.to_string(),
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
pub fn stop_ffplay() {
    let mut process = FFPLAY_PROCESS.lock().unwrap();
    if let Some(ref mut child) = *process {
        let _ = child.kill();
        let _ = child.wait();
    }
    *process = None;
}

#[tauri::command]
pub fn toggle_ffplay_pause() {
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
pub fn set_ffplay_volume(volume: u32) {
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
pub fn seek_ffplay(time: f64) {
    use std::io::Write;
    let mut process = FFPLAY_PROCESS.lock().unwrap();
    if let Some(ref mut child) = *process {
        if let Some(ref mut stdin) = child.stdin {
            let _ = writeln!(stdin, "seek {}", time);
            let _ = stdin.flush();
        }
    }
}

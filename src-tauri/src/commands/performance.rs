use once_cell::sync::Lazy;
use std::sync::Mutex;

#[derive(Default)]
struct DiskIoSnapshot {
    read_sectors: u64,
    write_sectors: u64,
    timestamp: Option<std::time::Instant>,
}

static DISK_IO_SNAPSHOT: Lazy<Mutex<DiskIoSnapshot>> =
    Lazy::new(|| Mutex::new(DiskIoSnapshot::default()));

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
                    if let (Ok(read), Ok(write)) =
                        (fields[5].parse::<u64>(), fields[9].parse::<u64>())
                    {
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

        (
            (read_speed * 10.0).round() / 10.0,
            (write_speed * 10.0).round() / 10.0,
        )
    }

    #[cfg(not(target_os = "linux"))]
    {
        (0.0, 0.0)
    }
}

#[tauri::command]
pub fn get_system_metrics() -> serde_json::Value {
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
pub fn get_ffmpeg_processes() -> Vec<serde_json::Value> {
    use std::collections::HashSet;
    use sysinfo::{ProcessStatus, System};

    let mut sys = System::new_all();
    sys.refresh_all();

    let thread_pids: HashSet<sysinfo::Pid> = sys
        .processes()
        .values()
        .filter_map(|p| p.tasks())
        .flatten()
        .copied()
        .collect();

    let processes: Vec<serde_json::Value> = sys
        .processes()
        .iter()
        .filter(|(pid, process)| {
            let name = process.name().to_string_lossy().to_lowercase();
            let is_ffmpeg = name.contains("ffmpeg") || name.contains("ffprobe");
            let is_main = !thread_pids.contains(pid);
            let is_alive = !matches!(
                process.status(),
                ProcessStatus::Zombie | ProcessStatus::Dead
            );
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
pub fn kill_process_by_pid(pid: u32) -> Result<(), String> {
    use sysinfo::{Pid, System};

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

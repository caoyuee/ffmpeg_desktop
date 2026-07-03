use std::env;

#[allow(dead_code)]
#[tauri::command]
pub fn get_startup_args() -> Vec<String> {
    env::args().collect()
}

#[allow(dead_code)]
#[tauri::command]
pub fn parse_startup_args() -> serde_json::Value {
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

// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    std::panic::set_hook(Box::new(|info| {
        let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic".to_string()
        };

        let location = if let Some(loc) = info.location() {
            format!("{}:{}:{}", loc.file(), loc.line(), loc.column())
        } else {
            "unknown location".to_string()
        };

        let err_msg = format!("Taghvim fatal error:\n{}\nat {}", payload, location);
        eprintln!("{}", err_msg);

        let crash_file = std::env::temp_dir().join("taghvim_crash.log");
        let _ = std::fs::write(&crash_file, &err_msg);
    }));

    taghvim_lib::run();
}

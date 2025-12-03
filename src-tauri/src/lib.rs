//! マイナンバーカード読み取りアプリ - Tauriバックエンド
//!
//! jsapduライブラリの仕様に基づき、券面事項入力補助AP（KENHOJO_AP）から
//! 基本4情報を読み取る

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod mynacard;
mod voicevox;

use serde::{Deserialize, Serialize};
use tauri::Manager;

/// 基本4情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BasicFourInfo {
    pub name: String,
    pub address: String,
    pub birth: String,
    pub gender: String,
}

/// マイナンバーカードから基本4情報を読み取る
#[tauri::command]
async fn read_card(pin: String) -> Result<BasicFourInfo, String> {
    mynacard::read_basic_four(&pin).await.map_err(|e| e.to_string())
}

/// VOICEVOX Coreで音声合成・再生
#[tauri::command]
async fn speak(text: String) -> Result<(), String> {
    voicevox::speak(&text).await.map_err(|e| e.to_string())
}

/// VOICEVOXの初期化状態を取得
#[tauri::command]
fn get_voicevox_status() -> bool {
    voicevox::is_available()
}

/// リーダー一覧を取得
#[tauri::command]
async fn get_readers() -> Result<Vec<String>, String> {
    mynacard::get_readers().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            read_card,
            speak,
            get_voicevox_status,
            get_readers
        ])
        .setup(|app| {
            // VOICEVOX Coreの初期化（非同期で行う）
            let resource_path = app.path().resource_dir().ok();
            if let Some(path) = resource_path {
                std::thread::spawn(move || {
                    let voicevox_path = path.join("voicevox");
                    if let Err(e) = voicevox::initialize(&voicevox_path) {
                        eprintln!("VOICEVOX初期化エラー: {}", e);
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("アプリケーション起動エラー");
}

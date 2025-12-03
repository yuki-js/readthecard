//! マイナンバーカード（券面事項入力補助AP）読み取りモジュール
//!
//! jsapdu (https://github.com/AokiApp/jsapdu) の仕様に基づいて実装
//! 券面事項入力補助AP（KENHOJO_AP）から基本4情報を読み取る

use crate::BasicFourInfo;
use pcsc::{Card, Context, Protocols, Scope, ShareMode};
use std::error::Error;

/// 券面事項入力補助AP (Kenhojo AP) の AID
/// jsapdu/packages/mynacard/src/aids.ts より
const KENHOJO_AP_AID: &[u8] = &[
    0xD3, 0x92, 0x10, 0x00, 0x00, 0x01, 0x00, 0x01, 0x04, 0x08,
];

/// 券面事項入力補助AP内のEF
/// jsapdu/packages/mynacard/src/ef.ts より
mod ef {
    /// 暗証番号 (PIN)
    pub const PIN: u8 = 0x01;
    /// 基本4情報
    pub const BASIC_FOUR: u8 = 0x02;
}

/// 利用可能なリーダー一覧を取得
pub fn get_readers() -> Result<Vec<String>, Box<dyn Error + Send + Sync>> {
    let ctx = Context::establish(Scope::User)?;
    let readers_buf = ctx.list_readers_owned()?;
    let readers: Vec<String> = readers_buf.iter().map(|r| r.to_string()).collect();
    Ok(readers)
}

/// 基本4情報を読み取る
pub async fn read_basic_four(pin: &str) -> Result<BasicFourInfo, Box<dyn Error + Send + Sync>> {
    // PINの検証
    if pin.len() != 4 || !pin.chars().all(|c| c.is_ascii_digit()) {
        return Err("PINは4桁の数字である必要があります".into());
    }

    // PC/SCコンテキストの取得
    let ctx = Context::establish(Scope::User)?;
    let readers_buf = ctx.list_readers_owned()?;
    let reader = readers_buf
        .first()
        .ok_or("カードリーダーが見つかりません")?;

    // カードに接続
    let card = ctx.connect(reader, ShareMode::Shared, Protocols::ANY)?;

    // 券面事項入力補助APを選択
    select_kenhojo_ap(&card)?;

    // PIN認証
    verify_pin(&card, pin)?;

    // 基本4情報を読み取り
    let data = read_basic_four_data(&card)?;

    // データをパース
    parse_basic_four(&data)
}

/// 券面事項入力補助APを選択
fn select_kenhojo_ap(card: &Card) -> Result<(), Box<dyn Error + Send + Sync>> {
    // SELECT DF コマンド (CLA=00, INS=A4, P1=04, P2=0C)
    let mut cmd = vec![0x00, 0xA4, 0x04, 0x0C, KENHOJO_AP_AID.len() as u8];
    cmd.extend_from_slice(KENHOJO_AP_AID);

    let mut response = [0u8; 258];
    let len = card.transmit(&cmd, &mut response)?;

    // SW1-SW2をチェック (90 00 = 成功)
    if len < 2 || response[len - 2] != 0x90 || response[len - 1] != 0x00 {
        return Err("券面事項入力補助APの選択に失敗しました".into());
    }

    Ok(())
}

/// PIN認証
fn verify_pin(card: &Card, pin: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
    // VERIFY コマンド (CLA=00, INS=20, P1=00, P2=80+EF番号)
    // PINデータはASCII形式
    let pin_bytes: Vec<u8> = pin.bytes().collect();
    let mut cmd = vec![0x00, 0x20, 0x00, 0x80 | ef::PIN, pin_bytes.len() as u8];
    cmd.extend_from_slice(&pin_bytes);

    let mut response = [0u8; 258];
    let len = card.transmit(&cmd, &mut response)?;

    // SW1-SW2をチェック
    if len < 2 {
        return Err("PIN認証の応答が不正です".into());
    }

    let sw1 = response[len - 2];
    let sw2 = response[len - 1];

    if sw1 == 0x90 && sw2 == 0x00 {
        Ok(())
    } else if sw1 == 0x63 {
        // 残り試行回数
        let remaining = sw2 & 0x0F;
        Err(format!("PIN認証に失敗しました（残り{}回）", remaining).into())
    } else if sw1 == 0x69 && sw2 == 0x84 {
        Err("PINがロックされています".into())
    } else {
        Err(format!("PIN認証エラー: SW={:02X}{:02X}", sw1, sw2).into())
    }
}

/// 基本4情報を読み取り
fn read_basic_four_data(card: &Card) -> Result<Vec<u8>, Box<dyn Error + Send + Sync>> {
    // READ BINARY コマンド (CLA=00, INS=B0, P1=80+EF番号, P2=オフセット)
    // Short EF指定で読み取り
    let mut all_data = Vec::new();
    let mut offset = 0u16;
    let chunk_size = 256u8;

    loop {
        let mut cmd = vec![
            0x00,
            0xB0,
            0x80 | ef::BASIC_FOUR,
            offset as u8,
            chunk_size,
        ];

        // オフセットが255を超える場合はP1-P2で指定
        if offset > 0 {
            cmd[2] = (offset >> 8) as u8;
            cmd[3] = (offset & 0xFF) as u8;
        }

        let mut response = [0u8; 512];
        let len = card.transmit(&cmd, &mut response)?;

        if len < 2 {
            return Err("READ BINARYの応答が不正です".into());
        }

        let sw1 = response[len - 2];
        let sw2 = response[len - 1];

        if sw1 == 0x90 && sw2 == 0x00 {
            // 成功
            all_data.extend_from_slice(&response[..len - 2]);
            break;
        } else if sw1 == 0x6C {
            // Le訂正要求 - 正しい長さで再試行
            cmd[4] = sw2;
            let len = card.transmit(&cmd, &mut response)?;
            if len >= 2 {
                all_data.extend_from_slice(&response[..len - 2]);
            }
            break;
        } else if sw1 == 0x61 {
            // より多くのデータがある
            all_data.extend_from_slice(&response[..len - 2]);
            offset += (len - 2) as u16;
        } else {
            return Err(format!("READ BINARYエラー: SW={:02X}{:02X}", sw1, sw2).into());
        }
    }

    Ok(all_data)
}

/// 基本4情報をパース
/// jsapdu/packages/mynacard/src/schemas.ts の schemaKenhojoBasicFour に基づく
fn parse_basic_four(data: &[u8]) -> Result<BasicFourInfo, Box<dyn Error + Send + Sync>> {
    // TLV形式でパース
    // タグ構造:
    // - 名前: DF21
    // - 住所: DF22
    // - 生年月日: DF23
    // - 性別: DF24

    let mut name = String::new();
    let mut address = String::new();
    let mut birth = String::new();
    let mut gender = String::new();

    let mut i = 0;
    while i < data.len() {
        // タグを読み取り（2バイト）
        if i + 1 >= data.len() {
            break;
        }
        let tag = ((data[i] as u16) << 8) | (data[i + 1] as u16);
        i += 2;

        // 長さを読み取り
        if i >= data.len() {
            break;
        }
        let length = data[i] as usize;
        i += 1;

        // 値を読み取り
        if i + length > data.len() {
            break;
        }
        let value = &data[i..i + length];
        i += length;

        // UTF-8としてデコード（Shift-JISの場合もあり）
        let text = String::from_utf8_lossy(value).to_string();

        match tag {
            0xDF21 => name = text,
            0xDF22 => address = text,
            0xDF23 => birth = text,
            0xDF24 => gender = text,
            _ => {} // 不明なタグはスキップ
        }
    }

    Ok(BasicFourInfo {
        name,
        address,
        birth,
        gender,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_basic_four() {
        // テストデータ
        let data = vec![
            0xDF, 0x21, 0x06, 0xE5, 0xB1, 0xB1, 0xE7, 0x94, 0xB0, // 名前: 山田
            0xDF, 0x22, 0x09, 0xE6, 0x9D, 0xB1, 0xE4, 0xBA, 0xAC, 0xE9, 0x83, 0xBD, // 住所: 東京都
            0xDF, 0x23, 0x09, 0x48, 0x30, 0x31, 0x2E, 0x30, 0x31, 0x2E, 0x30, 0x31, // 生年月日: H01.01.01
            0xDF, 0x24, 0x01, 0x31, // 性別: 1 (男性)
        ];

        let info = parse_basic_four(&data).unwrap();
        assert_eq!(info.name, "山田");
        assert_eq!(info.address, "東京都");
        assert_eq!(info.birth, "H01.01.01");
        assert_eq!(info.gender, "1");
    }
}

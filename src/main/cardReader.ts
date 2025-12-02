// Card reader module using pcsclite library
// Based on jsapdu documentation for MynaCard

import pcsclite from 'pcsclite';

interface BasicFourInfo {
  name: string;
  address: string;
  birthDate: string;
  gender: string;
}

// KENHOJO (券面事項入力補助) Application ID
const KENHOJO_AP = new Uint8Array([0xD3, 0x92, 0xF0, 0x00, 0x26, 0x01, 0x00, 0x00, 0x00, 0x02]);

// KENHOJO Application EF IDs
const KENHOJO_AP_EF = {
  PIN: 0x0012,
  BASIC_FOUR: 0x0002,
};

// PC/SC context and reader
let pcsc: ReturnType<typeof pcsclite> | null = null;
let currentReader: any = null;
let currentProtocol: number = 0;

function initPcsc(): ReturnType<typeof pcsclite> {
  if (!pcsc) {
    pcsc = pcsclite();
  }
  return pcsc;
}

export function waitForCard(): Promise<void> {
  return new Promise((resolve, reject) => {
    const pcscInstance = initPcsc();
    
    const timeout = setTimeout(() => {
      reject(new Error('カードリーダーが見つかりませんでした。タイムアウトしました。'));
    }, 60000);
    
    pcscInstance.on('reader', (reader: any) => {
      currentReader = reader;
      
      reader.on('status', (status: { state: number }) => {
        // Check for card presence
        const changes = reader.state ^ status.state;
        if (changes) {
          if ((changes & reader.SCARD_STATE_PRESENT) && (status.state & reader.SCARD_STATE_PRESENT)) {
            // Card inserted
            clearTimeout(timeout);
            
            reader.connect({ share_mode: reader.SCARD_SHARE_SHARED }, (err: Error | null, protocol: number) => {
              if (err) {
                reject(new Error(`カードへの接続に失敗しました: ${err.message}`));
                return;
              }
              currentProtocol = protocol;
              resolve();
            });
          }
        }
      });
      
      reader.on('error', (err: Error) => {
        clearTimeout(timeout);
        reject(new Error(`リーダーエラー: ${err.message}`));
      });
    });
    
    pcscInstance.on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(new Error(`PC/SCエラー: ${err.message}`));
    });
  });
}

function transmit(reader: any, protocol: number, data: Uint8Array, resLen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    reader.transmit(Buffer.from(data), resLen, protocol, (err: Error | null, response: Buffer) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(response);
    });
  });
}

// Build SELECT DF APDU command
function buildSelectDf(dfName: Uint8Array): Uint8Array {
  // CLA=0x00, INS=0xA4 (SELECT), P1=0x04 (select by DF name), P2=0x0C (no FCI)
  const apdu = new Uint8Array(5 + dfName.length);
  apdu[0] = 0x00; // CLA
  apdu[1] = 0xA4; // INS (SELECT)
  apdu[2] = 0x04; // P1 (select by DF name)
  apdu[3] = 0x0C; // P2 (no response data)
  apdu[4] = dfName.length; // Lc
  apdu.set(dfName, 5);
  return apdu;
}

// Build VERIFY command for PIN
function buildVerify(pin: string, efId: number): Uint8Array {
  const pinBytes = new TextEncoder().encode(pin);
  // CLA=0x00, INS=0x20 (VERIFY), P1=0x00, P2=EF ID (low byte)
  const apdu = new Uint8Array(5 + pinBytes.length);
  apdu[0] = 0x00; // CLA
  apdu[1] = 0x20; // INS (VERIFY)
  apdu[2] = 0x00; // P1
  apdu[3] = efId & 0xFF; // P2 (EF ID low byte)
  apdu[4] = pinBytes.length; // Lc
  apdu.set(pinBytes, 5);
  return apdu;
}

// Build SELECT EF command
function buildSelectEf(efId: number): Uint8Array {
  // CLA=0x00, INS=0xA4 (SELECT), P1=0x02 (select EF under current DF), P2=0x0C
  const efIdBytes = new Uint8Array(2);
  efIdBytes[0] = (efId >> 8) & 0xFF;
  efIdBytes[1] = efId & 0xFF;
  
  const apdu = new Uint8Array(7);
  apdu[0] = 0x00; // CLA
  apdu[1] = 0xA4; // INS (SELECT)
  apdu[2] = 0x02; // P1 (select EF under current DF)
  apdu[3] = 0x0C; // P2 (no response data)
  apdu[4] = 0x02; // Lc
  apdu[5] = efIdBytes[0];
  apdu[6] = efIdBytes[1];
  return apdu;
}

// Build READ BINARY command
function buildReadBinary(offset: number, length: number): Uint8Array {
  // CLA=0x00, INS=0xB0 (READ BINARY), P1=offset high, P2=offset low, Le=length
  const apdu = new Uint8Array(5);
  apdu[0] = 0x00; // CLA
  apdu[1] = 0xB0; // INS (READ BINARY)
  apdu[2] = (offset >> 8) & 0x7F; // P1 (offset high byte, without SFI)
  apdu[3] = offset & 0xFF; // P2 (offset low byte)
  apdu[4] = length & 0xFF; // Le
  return apdu;
}

// Check response status word
function checkSw(response: Buffer): { success: boolean; sw1: number; sw2: number; data: Buffer } {
  if (response.length < 2) {
    return { success: false, sw1: 0, sw2: 0, data: Buffer.alloc(0) };
  }
  const sw1 = response[response.length - 2];
  const sw2 = response[response.length - 1];
  const data = response.subarray(0, response.length - 2);
  return { success: sw1 === 0x90 && sw2 === 0x00, sw1, sw2, data };
}

// Read full EF binary data
async function readEfBinaryFull(reader: any, protocol: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let offset = 0;
  const chunkSize = 256;
  
  while (true) {
    const readCmd = buildReadBinary(offset, chunkSize);
    const response = await transmit(reader, protocol, readCmd, chunkSize + 2);
    const result = checkSw(response);
    
    if (!result.success) {
      // SW 6282 means end of file, SW 6B00 means wrong parameters (offset past end)
      if (result.sw1 === 0x62 || result.sw1 === 0x6B) {
        break;
      }
      // SW 6Cxx means wrong Le, try again with correct length
      if (result.sw1 === 0x6C) {
        const correctLen = result.sw2;
        const retryCmd = buildReadBinary(offset, correctLen);
        const retryResponse = await transmit(reader, protocol, retryCmd, correctLen + 2);
        const retryResult = checkSw(retryResponse);
        if (retryResult.success && retryResult.data.length > 0) {
          chunks.push(retryResult.data);
          offset += retryResult.data.length;
        }
        break;
      }
      throw new Error(`READ BINARY失敗: SW=${result.sw1.toString(16)}${result.sw2.toString(16)}`);
    }
    
    if (result.data.length === 0) {
      break;
    }
    
    chunks.push(result.data);
    offset += result.data.length;
    
    if (result.data.length < chunkSize) {
      break;
    }
  }
  
  return Buffer.concat(chunks);
}

// Parse TLV data for Basic Four information
function parseBasicFour(data: Buffer): BasicFourInfo {
  const decoder = new TextDecoder('utf-8');
  
  // The Basic Four data is in TLV format
  // Parse the TLV structure
  let offset = 0;
  const offsets: number[] = [];
  let name = '';
  let address = '';
  let birth = '';
  let gender = '';
  
  // First, read the header with offsets (DF 21 tag)
  while (offset < data.length) {
    const tag = data[offset];
    offset++;
    
    if (tag === 0xDF && offset < data.length) {
      const tag2 = data[offset];
      offset++;
      
      if (tag2 === 0x21) {
        // Offsets data
        const len = data[offset];
        offset++;
        for (let i = 0; i < len; i += 2) {
          offsets.push((data[offset + i] << 8) | data[offset + i + 1]);
        }
        offset += len;
      } else if (tag2 === 0x22) {
        // Name
        const len = data[offset];
        offset++;
        name = decoder.decode(data.subarray(offset, offset + len));
        offset += len;
      } else if (tag2 === 0x23) {
        // Address  
        const len = data[offset];
        offset++;
        address = decoder.decode(data.subarray(offset, offset + len));
        offset += len;
      } else if (tag2 === 0x24) {
        // Birth date
        const len = data[offset];
        offset++;
        birth = decoder.decode(data.subarray(offset, offset + len));
        offset += len;
      } else if (tag2 === 0x25) {
        // Gender
        const len = data[offset];
        offset++;
        gender = decoder.decode(data.subarray(offset, offset + len));
        offset += len;
      }
    }
  }
  
  return { name, address, birthDate: birth, gender };
}

export async function readMynaCard(pin: string): Promise<BasicFourInfo> {
  if (!currentReader) {
    throw new Error('カードリーダーが初期化されていません');
  }
  
  const reader = currentReader;
  const protocol = currentProtocol;
  
  try {
    // Step 1: Select KENHOJO application
    const selectDfCmd = buildSelectDf(KENHOJO_AP);
    const selectDfResp = await transmit(reader, protocol, selectDfCmd, 256);
    const selectDfResult = checkSw(selectDfResp);
    
    if (!selectDfResult.success) {
      throw new Error('券面事項入力補助APの選択に失敗しました。マイナンバーカードを確認してください。');
    }
    
    // Step 2: Select PIN EF and verify PIN
    const selectPinCmd = buildSelectEf(KENHOJO_AP_EF.PIN);
    const selectPinResp = await transmit(reader, protocol, selectPinCmd, 256);
    const selectPinResult = checkSw(selectPinResp);
    
    if (!selectPinResult.success) {
      throw new Error('暗証番号ファイルの選択に失敗しました。');
    }
    
    const verifyCmd = buildVerify(pin, KENHOJO_AP_EF.PIN);
    const verifyResp = await transmit(reader, protocol, verifyCmd, 256);
    const verifyResult = checkSw(verifyResp);
    
    if (!verifyResult.success) {
      if (verifyResult.sw1 === 0x63) {
        const remaining = verifyResult.sw2 & 0x0F;
        throw new Error(`暗証番号が間違っています。残り${remaining}回で利用停止になります。`);
      }
      throw new Error('暗証番号の認証に失敗しました。');
    }
    
    // Step 3: Select BASIC_FOUR EF and read data
    const selectBasicCmd = buildSelectEf(KENHOJO_AP_EF.BASIC_FOUR);
    const selectBasicResp = await transmit(reader, protocol, selectBasicCmd, 256);
    const selectBasicResult = checkSw(selectBasicResp);
    
    if (!selectBasicResult.success) {
      throw new Error('基本4情報ファイルの選択に失敗しました。');
    }
    
    // Read the Basic Four data
    const basicFourData = await readEfBinaryFull(reader, protocol);
    
    // Parse the TLV data
    const info = parseBasicFour(basicFourData);
    
    return info;
  } catch (error) {
    throw error;
  }
}

export function releasePlatform(): void {
  if (currentReader) {
    try {
      currentReader.disconnect(currentReader.SCARD_LEAVE_CARD, () => {});
    } catch {
      // Ignore errors on cleanup
    }
    currentReader = null;
  }
  if (pcsc) {
    try {
      pcsc.close();
    } catch {
      // Ignore errors on cleanup
    }
    pcsc = null;
  }
}

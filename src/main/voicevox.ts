// VOICEVOX integration for text-to-speech with ずんだもん
// VOICEVOX Engine must be running at http://127.0.0.1:50021

const VOICEVOX_BASE_URL = 'http://127.0.0.1:50021';

// ずんだもん speaker ID (ノーマル = 3)
const ZUNDAMON_SPEAKER_ID = 3;

interface AudioQuery {
  accent_phrases: unknown[];
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
  kana: string;
}

async function createAudioQuery(text: string, speakerId: number): Promise<AudioQuery> {
  const url = new URL('/audio_query', VOICEVOX_BASE_URL);
  url.searchParams.append('text', text);
  url.searchParams.append('speaker', speakerId.toString());

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`VOICEVOX audio_query failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<AudioQuery>;
}

async function synthesize(query: AudioQuery, speakerId: number): Promise<ArrayBuffer> {
  const url = new URL('/synthesis', VOICEVOX_BASE_URL);
  url.searchParams.append('speaker', speakerId.toString());

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'audio/wav',
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error(`VOICEVOX synthesis failed: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}

export async function speakWithVoicevox(text: string): Promise<void> {
  try {
    // Check if VOICEVOX is running
    const healthCheck = await fetch(`${VOICEVOX_BASE_URL}/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);
    
    if (!healthCheck || !healthCheck.ok) {
      throw new Error('VOICEVOXが起動していません。VOICEVOXを起動してください。');
    }

    // Create audio query
    const query = await createAudioQuery(text, ZUNDAMON_SPEAKER_ID);
    
    // Adjust speech parameters for clearer reading
    query.speedScale = 1.0;
    query.pitchScale = 0.0;
    query.volumeScale = 1.0;
    
    // Synthesize speech
    const audioData = await synthesize(query, ZUNDAMON_SPEAKER_ID);
    
    // Play audio using Electron's audio capabilities
    // We'll use the node-wav-player or built-in audio
    await playAudio(audioData);
  } catch (error) {
    console.error('VOICEVOX speech error:', error);
    throw error;
  }
}

async function playAudio(audioData: ArrayBuffer): Promise<void> {
  // Create a temporary file and play it
  const { writeFile, unlink } = await import('fs/promises');
  const { tmpdir } = await import('os');
  const { join } = await import('path');
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  
  const execAsync = promisify(exec);
  const tempFile = join(tmpdir(), `voicevox-${Date.now()}.wav`);
  
  try {
    await writeFile(tempFile, Buffer.from(audioData));
    
    // Use PowerShell to play audio on Windows
    if (process.platform === 'win32') {
      await execAsync(`powershell -c "(New-Object Media.SoundPlayer '${tempFile}').PlaySync()"`);
    } else if (process.platform === 'darwin') {
      // Use afplay on macOS
      await execAsync(`afplay "${tempFile}"`);
    } else {
      // Use aplay or paplay on Linux
      try {
        await execAsync(`paplay "${tempFile}"`);
      } catch {
        await execAsync(`aplay "${tempFile}"`);
      }
    }
  } finally {
    // Clean up temp file
    try {
      await unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

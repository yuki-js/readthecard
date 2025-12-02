// Type declarations for pcsclite
declare module 'pcsclite' {
  import { EventEmitter } from 'events';

  interface Reader extends EventEmitter {
    name: string;
    state: number;
    SCARD_STATE_PRESENT: number;
    SCARD_STATE_EMPTY: number;
    SCARD_STATE_MUTE: number;
    SCARD_SHARE_SHARED: number;
    SCARD_SHARE_EXCLUSIVE: number;
    SCARD_LEAVE_CARD: number;
    SCARD_RESET_CARD: number;
    SCARD_UNPOWER_CARD: number;
    SCARD_EJECT_CARD: number;
    
    connect(
      options: { share_mode?: number; protocol?: number },
      callback: (err: Error | null, protocol: number) => void
    ): void;
    
    disconnect(disposition: number, callback: (err: Error | null) => void): void;
    
    transmit(
      data: Buffer,
      resLen: number,
      protocol: number,
      callback: (err: Error | null, response: Buffer) => void
    ): void;
    
    close(): void;
  }

  interface PCSCLite extends EventEmitter {
    on(event: 'reader', listener: (reader: Reader) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    close(): void;
  }

  function pcsclite(): PCSCLite;
  export = pcsclite;
}

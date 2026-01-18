import type { PinTarget, PinTargetId } from "../../managers/PinRefresherRunner";

export type { PinTarget, PinTargetId };

export type RowState = {
  pin: string;
  check?: { sw: number; remainingAttempts?: number; at: number };
  verify?: { ok: boolean; sw: number; remainingAttempts?: number; at: number };
  busy?: boolean;
  error?: string;
};

export type BuilderState = {
  kojinBango?: string;
  error?: string;
};

export type PinBDobPopupState = {
  open: boolean;
  /** which row invoked this builder */
  target?: PinTargetId;
  dob: string;
  expireYear: string;
  securityCode: string;
  error?: string;
};

import type { PinTarget } from "../../managers/PinRefresherRunner";

export function formatSw(sw: number): string {
  return "0x" + (sw & 0xffff).toString(16).padStart(4, "0").toUpperCase();
}

export function now(): number {
  return Date.now();
}

export function defaultPinForTarget(target: PinTarget): string {
  return target.defaultPin ?? "";
}

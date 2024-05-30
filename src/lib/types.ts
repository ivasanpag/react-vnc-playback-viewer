import { ReactNode } from "react";

export interface Frame {
  fromClient: boolean;
  timestamp: number;
  data: any;
}

export class FakeWebSocket {
  binaryType: BinaryType;
  protocol: string;
  readyState: string;
  onerror: (this: FakeWebSocket, ev: Event) => any;
  onmessage: (this: FakeWebSocket, ev: MessageEvent) => any;
  onopen: (this: FakeWebSocket, ev: Event) => any;
  onclose: (this: FakeWebSocket, ev: CloseEvent) => any;

  constructor() {
    this.binaryType = "arraybuffer";
    this.protocol = "";
    this.readyState = "open";

    this.onerror = () => {};
    this.onmessage = () => {};
    this.onopen = () => {};
    this.onclose = () => {};
  }

  send(data: any): void {}
  close(code?: number, reason?: string): void {}
}

export interface CustomTimeout extends Function {
  (a: any, b: number): number;
  clearAll: () => void;
  clearCalled: () => void;
}

export type VncPlaybackViewerHandle = {
  start: (realtime: boolean) => void;
  running: boolean;
  stop: () => void;
  finish: () => void;
  resume: () => void;
};

export type VncPlaybackViewerProps = {
  onIterationFinish?: () => void;
  onDisconnect: () => void;
  onFinish: (evt: any) => void;
  debug?: boolean;
  loader?: ReactNode;
  style?: object;
  className?: string;
  frames: Frame[];
};

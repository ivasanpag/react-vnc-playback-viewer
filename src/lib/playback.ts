
import RFB from '../noVNC/core/rfb';
import { Frame } from './types';


class FakeWebSocket {
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


export default class RecordingPlayer {
    
    private _frames: Frame[];
    private _disconnected: (clean: boolean, frameIndex: number) => void;
    private _rfb: RFB | undefined;
    private _frameLength: number;
    private _frameIndex: number;
    private _startTime: number | undefined;
    private _realtime: boolean;
    private _trafficManagement: boolean;
    private _running: boolean;
    private _ws: FakeWebSocket | undefined;

    onfinish: (elapsed: number) => void;

    constructor(frames: Frame[], disconnected: (clean: boolean, frameIndex: number) => void, onfinish: (elapsed: number) => void) {
        this._frames = frames;
        this._disconnected = disconnected;
        this._rfb = undefined;
        this._frameLength = this._frames.length;
        this._frameIndex = 0;
        this._startTime = undefined;
        this._realtime = true;
        this._trafficManagement = true;
        this._running = false;
        this.onfinish = onfinish;
    }

    run(realtime: boolean, trafficManagement?: boolean): void {
        this._ws = new FakeWebSocket();
        //@ts-ignore
        this._rfb = new RFB(document.getElementById('VNC_screen') as HTMLElement, this._ws);
        this._rfb.viewOnly = true;
        this._rfb.addEventListener("disconnect", this._handleDisconnect.bind(this));
        this._rfb.addEventListener("credentialsrequired", this._handleCredentials.bind(this));

        this._frameIndex = 0;
        this._startTime = new Date().getTime();
        this._realtime = realtime;
        this._trafficManagement = (trafficManagement === undefined) ? !realtime : trafficManagement;
        this._running = true;
        this._queueNextPacket();
    }

    private _queueNextPacket(): void {
        if (!this._running) { return; }

        let frame = this._frames[this._frameIndex];

        while (this._frameIndex < this._frameLength && frame.fromClient) {
            this._frameIndex++;
            frame = this._frames[this._frameIndex];
        }

        if (this._frameIndex >= this._frameLength) {
            console.log('Finished, no more frames');
            this._finish();
            return;
        }

        if (this._realtime) {
            const toffset = new Date().getTime() - this._startTime!;
            let delay = frame.timestamp - toffset;
            if (delay < 1) delay = 1;

            setTimeout(this._doPacket.bind(this), delay);
        } else {
            window.setImmediate(this._doPacket.bind(this));
        }
    }

    private _doPacket(): void {
        if (this._trafficManagement && this._rfb!._flushing) {
            this._rfb!._display.flush().then(() => {
                this._doPacket();
            });
            return;
        }

        const frame = this._frames[this._frameIndex];
        this._ws!.onmessage({ data: frame.data } as MessageEvent);
        this._frameIndex++;
        this._queueNextPacket();
    }

    private _finish(): void {
        if (this._rfb!._display.pending()) {
            this._rfb!._display.flush().then(() => { this._finish(); });
        } else {
            this._running = false;
            this._ws!.onclose({ code: 1000, reason: "" } as CloseEvent);
            this._rfb = undefined;
            this.onfinish(new Date().getTime() - this._startTime!);
        }
    }

    private _handleDisconnect(evt: Event): void {
        this._running = false;
        const detail = (evt as CustomEvent).detail;
        this._disconnected(detail.clean, this._frameIndex);
    }

    private _handleCredentials(evt: Event): void {
        this._rfb!.sendCredentials({ "username": "Foo", "password": "Bar", "target": "Baz" });
    }
}

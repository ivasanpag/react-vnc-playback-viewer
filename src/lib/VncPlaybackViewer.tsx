import React, { forwardRef, ForwardRefRenderFunction, useEffect, useImperativeHandle, useRef, useState } from "react";
import { FakeWebSocket, Frame, VncPlaybackViewerHandle, VncPlaybackViewerProps } from "./types";
import RFB from "../noVNC/core/rfb";
import { setCustomTimeout } from "./helper";

const VncPlaybackViewer: ForwardRefRenderFunction<VncPlaybackViewerHandle, VncPlaybackViewerProps> = ({ frames, onDisconnect, onFinish, debug = false, style, className, loader }, ref) => {
  useEffect(() => {
    // Immediate polyfill
    if (window.setImmediate === undefined) {
      let _immediateIdCounter = 1;
      const _immediateFuncs: any = {};

      //@ts-ignore
      window.setImmediate = (func: any) => {
        const index = _immediateIdCounter++;
        _immediateFuncs[index] = func;
        window.postMessage("noVNC immediate trigger:" + index, "*");
        return index;
      };
      //@ts-ignore
      window.clearImmediate = (id: number) => {
        // eslint-disable-next-line
        _immediateFuncs[id];
      };

      window.addEventListener("message", (event) => {
        if (typeof event.data !== "string" || event.data.indexOf("noVNC immediate trigger:") !== 0) {
          return;
        }

        const index = event.data.slice("noVNC immediate trigger:".length);

        const callback = _immediateFuncs[index];
        if (callback === undefined) {
          return;
        }

        delete _immediateFuncs[index];

        callback();
      });
    }
  }, []);

  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const [realtime, setRealtime] = useState<boolean>(true);

  const [trafficManagement, setTrafficManagement] = useState(true);
  const [running, setRunning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [resumed, setResumed] = useState<boolean>(false);
  const [frameIndexAt, setFrameIndexAt] = useState<number>(0);

  const rfbRef = useRef<RFB | undefined>(undefined);
  const wsRef = useRef<FakeWebSocket | undefined>(undefined);
  const screen = useRef<HTMLDivElement | null>(null);
  let frameIndex = 0;

  const start = (realtime: boolean) => {
    setStartTime(new Date().getTime());
    setRealtime(realtime);
    setRunning(true);
    run(realtime, false);
  };

  const resume = () => {
    setRunning(true);
  };

  const logger = {
    log: (...args: any[]) => {
      if (debug) logger.info(...args);
    },
    info: (...args: any[]) => {
      if (debug) console.info(...args);
    },
    error: (...args: any[]) => {
      if (debug) console.error(...args);
    },
  };

  useEffect(() => {
    if (running) {
      frameIndex = frameIndexAt;
      queueNextPacket();
    }
    return () => {
      // Cleanup code if necessary
    };
  }, [running]);

  const run = (realtime: boolean, trafficManagement?: boolean) => {
    if (resumed) {
      resume();
      return;
    }

    if (screen.current === undefined) return;

    frameIndex = 0;
    wsRef.current = new FakeWebSocket();
    rfbRef.current = new RFB(screen.current, wsRef.current);
    rfbRef.current.viewOnly = true;
    rfbRef.current.addEventListener("disconnect", handleDisconnect);
    rfbRef.current.addEventListener("credentialsrequired", handleCredentials);

    setStartTime(new Date().getTime());
    setTrafficManagement(trafficManagement === undefined ? !realtime : trafficManagement);

    setLoading(false);

    queueNextPacket();
  };

  const queueNextPacket = () => {
    if (!running) return;
    let frame = frames[frameIndex];

    while (frameIndex < frames.length && frame.fromClient) {
      frameIndex++;
      frame = frames[frameIndex];
    }

    if (frameIndex >= frames.length) {
      logger.info("Finished, no more frames");
      finish();
      return;
    }

    if (realtime) {
      const toffset = new Date().getTime() - startTime!;
      let delay = frame.timestamp - toffset;
      if (delay < 1) delay = 1;

      setCustomTimeout(doPacket, delay)
    } else {
      window.setImmediate(doPacket);
    }
  };

  const doPacket = () => {
    setCustomTimeout.clearCalled();
    if (trafficManagement && rfbRef.current?._flushing) {
      rfbRef.current?._display.flush().then(() => {
        doPacket();
      });
      return;
    }

    const frame = frames[frameIndex];
    if (frame && frame.data && running) {
      wsRef.current?.onmessage({ data: frame.data } as MessageEvent);
      frameIndex++;
      queueNextPacket();
    }
  };

  const finish = () => {
    if (rfbRef.current && rfbRef.current._display.pending()) {
      rfbRef.current._display.flush().then(() => {
        finish();
      });
    } else {
      setRunning(false);
      wsRef.current!.onclose({ code: 1000, reason: "" } as CloseEvent);
      rfbRef.current = undefined;
      frameIndex = frames.length + 1;
      onFinish(new Date().getTime() - startTime!);
      setFrameIndexAt(0);
    }
  };

  const handleDisconnect = (evt: Event) => {
    setRunning(false);
    const detail = (evt as CustomEvent).detail;
    onDisconnect();
  };

  const stop = () => {
    setCustomTimeout.clearAll();
    setFrameIndexAt(frameIndex);
    setRunning(false);
    setResumed(true);
  };

  const handleCredentials = (evt: Event) => {
    rfbRef.current!.sendCredentials({ username: "Foo", password: "Bar", target: "Baz" });
  };

  useImperativeHandle(ref, () => ({
    start,
    running,
    finish,
    stop,
    resume,
  }));

  return (
    <>
      {loading && (loader ?? <p>Loading...</p>)}
      <div ref={screen} style={style} className={className}>
        {/* Render the VNC screen or any other UI elements */}
      </div>
    </>
  );
};
export default forwardRef(VncPlaybackViewer);

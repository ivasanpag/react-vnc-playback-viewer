import React, { forwardRef, ForwardRefRenderFunction, useEffect, useImperativeHandle, useRef, useState } from "react";
import { FakeWebSocket, VncPlaybackViewerHandle, VncPlaybackViewerProps } from "./types";
import RFB from "../noVNC/core/rfb";
import { setCustomTimeout } from "./helper";
import TimerComponent from "./TimerComponent";

const VncPlaybackViewer: ForwardRefRenderFunction<VncPlaybackViewerHandle, VncPlaybackViewerProps> = (
  { frames, onDisconnect, onStop, onFinish, onResume, debug = false, showProgressBar = false, style, progressBarStyle, className, loader },
  ref
) => {
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
  const [stopOffsetTime, setStopOffsetTime] = useState<number>(0);
  const [realtime, setRealtime] = useState<boolean>(true);

  const [trafficManagement, setTrafficManagement] = useState(true);
  const [running, setRunning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [resumed, setResumed] = useState<boolean>(false);
  const [frameIndexAt, setFrameIndexAt] = useState<number>(0);
  const [progressTime, setProgressTime] = useState<number>(0);

  const rfbRef = useRef<RFB | undefined>(undefined);
  const wsRef = useRef<FakeWebSocket | undefined>(undefined);
  const screen = useRef<HTMLDivElement | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(frameIndexAt);
  const frameIndexRef = useRef<number>(0);

  // timer component for progressbar
  const timerRef = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (!showProgressBar) return;

    const timer = () => {
      if (frameIndexRef.current !== 0) setCurrentFrameIndex(frameIndexRef.current);
    };

    timerRef.current = setInterval(timer, 1000);
    timer();
    return () => {
      clearInterval(timerRef.current);
    };
  }, [running, showProgressBar]);

  const start = (realtime: boolean) => {
    setStartTime(new Date().getTime());
    setRealtime(realtime);
    setRunning(true);
    run(realtime, false);
  };

  const resume = () => {
    setRunning(true);
    setStopOffsetTime((prev) => new Date().getTime() - prev);
    if (onResume) onResume();
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
      frameIndexRef.current = frameIndexAt;
      queueNextPacket();
    }
    return () => {
      // Cleanup code if necessary
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const run = (realtime: boolean, trafficManagement?: boolean) => {
    if (resumed) {
      resume();
      return;
    }

    if (screen.current === undefined) return;

    frameIndexRef.current = 0;
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
    let frame = frames[frameIndexRef.current];

    while (frameIndexRef.current < frames.length && frame.fromClient) {
      frameIndexRef.current++;
      frame = frames[frameIndexRef.current];
    }

    if (frameIndexRef.current >= frames.length) {
      logger.info("Finished, no more frames");
      finish();
      return;
    }

    if (realtime) {
      let toffset = new Date().getTime() - startTime! - stopOffsetTime;
      let delay = frame.timestamp - (toffset + progressTime);
      if (delay < 1) delay = 1;

      setCustomTimeout(doPacket, delay);
    } else {
      window.setImmediate(doPacket);
    }
  };

  const queueNextPacketUntilFrame = (frameAt: number) => {
    let frame = frames[frameIndexRef.current];
    if (frameIndexRef.current > frameAt) return;

    while (frameIndexRef.current < frames.length && frame.fromClient) {
      frameIndexRef.current++;
      frame = frames[frameIndexRef.current];
    }

    if (frameIndexRef.current >= frames.length) {
      logger.info("Finished, no more frames");
      finish();
      return;
    }

    if (frame && frame.data) {
      wsRef.current?.onmessage({ data: frame.data } as MessageEvent);
      frameIndexRef.current++;
      queueNextPacketUntilFrame(frameAt);
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

    const frame = frames[frameIndexRef.current];
    if (frame && frame.data && running) {
      wsRef.current?.onmessage({ data: frame.data } as MessageEvent);
      frameIndexRef.current++;
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
      frameIndexRef.current = frames.length + 1;
      if (onFinish) onFinish(new Date().getTime() - startTime!);
      setFrameIndexAt(0);
    }
  };

  const handleDisconnect = (evt: Event) => {
    setRunning(false);
    if (onDisconnect) onDisconnect();
  };

  const stop = () => {
    setCustomTimeout.clearAll();
    setStopOffsetTime(new Date().getTime());
    setFrameIndexAt(frameIndexRef.current);
    setRunning(false);
    setResumed(true);
    if (onStop) onStop();
  };

  const handleCredentials = (evt: Event) => {
    rfbRef.current!.sendCredentials({ username: "Foo", password: "Bar", target: "Baz" });
  };

  const onProgressBarChange = (frame: string) => {
    if (running) {
      stop();
    }
    const time = frames[Number(frame)].timestamp - frames[frameIndexRef.current].timestamp;
    setProgressTime(time);
    // Only works when move in advance
    queueNextPacketUntilFrame(Number(frame));
    setFrameIndexAt(frameIndexRef.current);

    if (running) {
      setTimeout(resume, 1000);
    }
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
      {showProgressBar ? <TimerComponent framesLength={frames.length} currentFrame={currentFrameIndex} progressBarStyle={progressBarStyle} onProgressBarChange={onProgressBarChange} /> : <></>}
      <div ref={screen} style={style} className={className}>
        {/* Render the VNC screen or any other UI elements */}
      </div>
    </>
  );
};
export default forwardRef(VncPlaybackViewer);

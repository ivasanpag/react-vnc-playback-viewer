import React, { useEffect, useRef, useState } from "react";
import { VNC_frame_data } from "./frames";
import { Frame, VncPlaybackViewer } from "./lib";
import { loadFrames } from "./lib/helper";
const App = () => {
  const [frames, setFrames] = useState<Frame[]>([]);
  const vncPlaybackScreenRef = useRef<React.ElementRef<typeof VncPlaybackViewer>>(null);
  useEffect(() => {
    const frames = loadFrames(VNC_frame_data);
    if (frames) setFrames(frames);
  }, []);


  const start = (realtime: boolean) => {
    const { start } = vncPlaybackScreenRef.current ?? {};
    start?.(realtime);
  };

  const resume = () => {
    const { resume } = vncPlaybackScreenRef.current ?? {};
    resume?.();
  };

  const stop = () => {
    const { stop } = vncPlaybackScreenRef.current ?? {};
    stop?.();
  };

  const finish = () => {
    const { finish } = vncPlaybackScreenRef.current ?? {};
    finish?.();
  };

  return (
    <div>
      <div>
        <button
          onClick={() => {
            start(true);
          }}
        >
          Start Realtime
        </button>
        <button onClick={() => start(false)}>Start Fullspeed</button>
        <button
          onClick={() => {
            stop();
          }}
        >
          Stop
        </button>
        <button onClick={() => resume()}>Resume</button>
        <button onClick={() => finish()}>Finish</button>
      </div>

  

      {frames && frames.length > 0 ? (
        <VncPlaybackViewer
          frames={frames}
          debug={true}
          ref={vncPlaybackScreenRef}
          style={{ height: "100vh", width: "100%" }}
          onFinish={() => console.log(`Iteration finish`)}
          onDisconnect={() => console.log(`noVNC sent disconnected`)}
          onResume={() => console.log(`Iteration resumed`)}
          onStop={() => console.log(`Iteration stopped`)}
          showProgressBar={true}
          progressBarStyle={{ height: "20px", width: "80%", backgroundColor: "blue", fontSize: "0.75rem", color: "white" }}
        />
      ) : (
        <></>
      )}
    </div>
  );
};

export default App;

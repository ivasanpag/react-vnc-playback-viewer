import base64 from "../noVNC/core/base64";
import { CustomTimeout, Frame } from "./types";

export const setCustomTimeout = (function (oldSetTimeout) {
  const registered: { id: number; called: boolean }[] = [];

  const f = function (callback: any, delay: number) {
    const timeoutId = oldSetTimeout(() => {
      callback();
      // Mark this timeout as called
      const index = registered.findIndex((t) => t.id === timeoutId);
      if (index !== -1) registered[index].called = true;
    }, delay);

    registered.push({ id: timeoutId, called: false });
    return timeoutId;
  } as CustomTimeout;

  f.clearAll = function () {
    let r;
    while ((r = registered.pop())) clearTimeout(r.id);
  };

  f.clearCalled = async function () {
    for (let i = registered.length - 1; i >= 0; i--) {
      if (registered[i].called) registered.splice(i, 1);
    }
  };

  return f;
})(window.setTimeout);

export const loadFrames = (framesData: string[]) => {
  try {
    if (!framesData) throw new Error("No frame data found");

    let frames = framesData as string[];

    let frame = frames[0];
    let start = frame.indexOf("{", 1) + 1;
    const encoding = frame.slice(start, start + 4) === "UkZC" ? "base64" : "binary";

    const processedFrames = frames.reduce((acc: Frame[], frame, i) => {
      if (frame === "EOF") {
        frames.splice(i);
        return acc;
      }

      const dataIdx = frame.indexOf("{", 1) + 1;
      const time = parseInt(frame.slice(1, dataIdx - 1));
      const data = encoding === "base64" ? base64.decode(frame.slice(dataIdx)) : new Uint8Array(frame.length - dataIdx).map((_, j) => frame.charCodeAt(dataIdx + j));

      acc.push({ fromClient: frame[0] === "}", timestamp: time, data });
      return acc;
    }, []);

    return processedFrames;
  } catch (e) {
    console.log(e);
  }
};

module.exports = {
  loadFrames
}
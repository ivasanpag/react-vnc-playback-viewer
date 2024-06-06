
interface TimerComponentProps {
  framesLength: number;
  currentFrame: number;
  progressBarStyle?: object;
  onProgressBarChange: (frame: string) => void
}
const TimerComponent = ({ framesLength, currentFrame, progressBarStyle, onProgressBarChange }: TimerComponentProps) => {
  const onChange = (frame: string) => {
    onProgressBarChange(frame)
  }
  
  return (
    <>
      <div style={{width: '100%'}}>
        {currentFrame} / {framesLength}
      </div>
      <input type="range" id="progress"  style={progressBarStyle} min="0" max={framesLength} value={currentFrame} step="1" onChange={(e) => onChange(e.target.value)}></input>
    </>
  );
};

export default TimerComponent;

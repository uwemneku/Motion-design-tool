import { useCanvasAppContext } from "../hooks/use-canvas-app-context";

function CanvasPreviewButton() {
  const { fabricCanvas } = useCanvasAppContext();

  const getScreenShot = async () => {
    const canvas = fabricCanvas.current;
    console.log(canvas);

    if (!canvas) return;
    const dataURL = await canvas.toBlob({
      format: "png",
      quality: 1,
      multiplier: 2, // Increase resolution for better quality
    });
    console.log(dataURL);

    //  open in new tab via url
    const url = URL.createObjectURL(dataURL);
    console.log(url);

    // window.open(dataURL, "_blank", "noopener,noreferrer");
  };
  return (
    <div>
      <button onClick={getScreenShot}>
        <span className="rounded-md border border-[var(--wise-accent)]/75 bg-[var(--wise-accent)]/20 px-2.5 py-1.5 text-sm font-medium text-[#dcefff] hover:bg-[var(--wise-accent)]/30">
          Preview
        </span>
      </button>
    </div>
  );
}

export default CanvasPreviewButton;

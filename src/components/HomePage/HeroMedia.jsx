import { useEffect, useState } from "react";
import campusImage from "../../assets/campus-image.jpg.jpeg";
import campusVideo from "../../assets/campus-vedio.mp4";
//for slow network->only photo else video will be shown
const POSTER = campusImage;
const VIDEO = campusVideo;

function connectionIsFast() {
  const c =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return true; // no info -> assume capable
  if (c.saveData) return false;
  return !/(^|-)(slow-2g|2g|3g)$/.test(c.effectiveType || "");
}

export default function HeroMedia({ onFastNet }) {
  const [useVideo, setUseVideo] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (connectionIsFast()) {
      setUseVideo(true);
      if (onFastNet) onFastNet(true);
    }
  }, [onFastNet]);

  const handleCanPlay = () => {
    setReady(true);
    if (onFastNet) onFastNet(true);
  };

  return (
    <div className="hero-media" aria-hidden="true">
      <img className="hero-media__img" src={POSTER} alt="" loading="eager" fetchPriority="high" />
      {useVideo && (
        <video
          className={"hero-media__video" + (ready ? " is-ready" : "")}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={POSTER}
          onCanPlay={handleCanPlay}
          onError={() => setUseVideo(false)}
        >
          <source src={VIDEO} type="video/mp4" />
        </video>
      )}
      <div className="hero-media__scrim" />
    </div>
  );
}

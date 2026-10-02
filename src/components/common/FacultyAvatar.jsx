import { useState } from "react";
import { User } from "lucide-react";
import "./FacultyAvatar.css";

// Faculty avatars are the slowest part of a subject grid: one image request per
// card, none of them guaranteed to be cached yet. This wrapper paints a grey
// disc with a user glyph immediately, then swaps in the photo, so a card never
// renders as an empty hole while the bytes are in flight.
//
// It also takes the pressure off slow connections in two other ways: the
// browser is allowed to defer off-screen images, and a broken/removed avatar
// URL falls back to the same glyph instead of the browser's broken-image icon.
export default function FacultyAvatar({
  src,
  name = "",
  className = "",
  size = 40,
  loading = "lazy",
}) {
  // Load/failure state is keyed by URL instead of being reset in an effect, so
  // changing the avatar re-derives cleanly during render.
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);

  const isLoaded = Boolean(src) && loadedSrc === src;
  const hasFailed = Boolean(src) && failedSrc === src;
  const showImage = Boolean(src) && !hasFailed;

  return (
    <span
      className={`faculty-avatar ${isLoaded ? "faculty-avatar--loaded" : ""} ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <span className="faculty-avatar__placeholder" aria-hidden="true">
        <User size={Math.round(size * 0.45)} />
      </span>
      {showImage && (
        <img
          className="faculty-avatar__img"
          src={src}
          alt={name ? `${name} photo` : "Faculty photo"}
          width={size}
          height={size}
          loading={loading}
          decoding="async"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
        />
      )}
    </span>
  );
}

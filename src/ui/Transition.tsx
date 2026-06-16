import { useEffect, useState } from "react";
import { useMuseumStore } from "../state/store";

// Gentle hallway fade (§2.4): out → swap room (while black) → in.
const FADE_OUT_MS = 360;
const FADE_IN_AT_MS = 440;
const DONE_MS = 820;

/** Full-screen fade that masks room swaps (§2.4). */
export function Transition() {
  const isTraveling = useMuseumStore((s) => s.isTraveling);
  const commitTravel = useMuseumStore((s) => s.commitTravel);
  const endTravel = useMuseumStore((s) => s.endTravel);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!isTraveling) return;
    setOpacity(1);
    const t1 = setTimeout(commitTravel, FADE_OUT_MS);
    const t2 = setTimeout(() => setOpacity(0), FADE_IN_AT_MS);
    const t3 = setTimeout(endTravel, DONE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isTraveling, commitTravel, endTravel]);

  return <div className="fade" style={{ opacity }} aria-hidden="true" />;
}

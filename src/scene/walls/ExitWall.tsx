import type { Exit } from "../../model/types";
import { wallTransform } from "../../geometry/hexagon";
import { DOOR_HEIGHT, DOOR_WIDTH, HALL_WIDTH } from "../../geometry/hallway";
import { roomDisplayName } from "../../model/labels";
import { interactable } from "../../interaction/types";
import { introPanelTexture } from "../canvasTextures";
import { CanvasPlane } from "../CanvasPlane";
import { TextPlane } from "../TextPlane";

/** Wall text introducing a room (§7.4). */
export interface IntroText {
  heading: string; // e.g. "Ground Floor"
  title: string; // "Ancient Egypt"
  dates: string;
  text: string;
}

const PANEL_W = 0.8;
const PANEL_H = 1.25;

/**
 * A doorway (§3.1 / §6.2). Beyond it runs a walkable hallway (§2.7, drawn by
 * HallwayView); here we add a faint veil in the opening — hovering it names the
 * room the hallway leads to — in the atrium a color-cued sign above the door
 * (§3.2), and on the hallway side of the wall, beside the opening, the room's
 * introductory wall text, read as you arrive.
 */
export function ExitWall({
  exit,
  sign,
  accent,
  intro,
}: {
  exit: Exit;
  sign?: string;
  accent?: string;
  intro?: IntroText;
}) {
  if (exit.wallIndex === undefined) return null;
  const t = wallTransform(exit.wallIndex);
  const dest = roomDisplayName(exit.toRoomId);
  const veil = accent ?? "#cdb37a";
  // Centred in the strip of wall between the opening and the hallway's side wall.
  const panelX = (DOOR_WIDTH / 2 + HALL_WIDTH / 2) / 2;

  return (
    <group position={[t.position[0], 0, t.position[2]]} rotation-y={t.rotationY}>
      <mesh
        position={[0, DOOR_HEIGHT / 2, 0.02]}
        userData={interactable({
          kind: "exit",
          id: `exit:${exit.toRoomId}`,
          label: `To ${dest} →`,
          targetRoomId: exit.toRoomId,
        })}
      >
        {/* front side only: it faces into the room, so from the hallway looking
            back it neither shows nor answers with the wrong "To …" label */}
        <planeGeometry args={[DOOR_WIDTH, DOOR_HEIGHT]} />
        <meshBasicMaterial color={veil} transparent opacity={0.06} depthWrite={false} />
      </mesh>

      {sign && (
        <group position={[0, DOOR_HEIGHT + 0.55, 0.05]}>
          <mesh position-z={-0.01}>
            <planeGeometry args={[2.36, 0.68]} />
            <meshBasicMaterial color={veil} toneMapped={false} />
          </mesh>
          <TextPlane
            width={2.3}
            height={0.62}
            style={{ background: "#0b0a0d", border: "rgba(194,162,90,0.45)" }}
            lines={[{ text: sign, size: 0.36 }]}
          />
        </group>
      )}

      {intro && (
        // Outside face of the wall (local −Z), unlit like the hallway it faces.
        <group position={[panelX, 1.85, -0.025]} rotation-y={Math.PI}>
          <CanvasPlane
            width={PANEL_W}
            height={PANEL_H}
            cacheKey={`${intro.heading}|${intro.title}|${intro.dates}|${intro.text}`}
            make={() =>
              introPanelTexture(
                intro.heading,
                intro.title,
                intro.dates,
                intro.text,
                PANEL_W,
                PANEL_H,
              )
            }
          />
        </group>
      )}
    </group>
  );
}

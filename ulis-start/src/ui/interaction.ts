// Web hover / focus helpers for Pressable style callbacks. No-ops on native.
import { Platform, type PressableStateCallbackType, type ViewStyle } from 'react-native';

/** react-native-web passes `hovered` / `focused` too; RN's types only declare `pressed`. */
export interface WebPressState {
  pressed: boolean;
  hovered?: boolean;
  focused?: boolean;
}

export const isWeb = Platform.OS === 'web';

export function pressState(state: PressableStateCallbackType): WebPressState {
  return state as WebPressState;
}

/** cursor: pointer on web. */
export const pointer: ViewStyle | null = isWeb ? { cursor: 'pointer' } : null;

/** Visible keyboard focus ring on web. */
export function focusRing(state: PressableStateCallbackType, color: string, offset = 2): ViewStyle | null {
  const s = pressState(state);
  return isWeb && s.focused ? { outlineColor: color, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: offset } : null;
}

/** Common interactive style: pointer + focus ring + pressed/hover opacity. */
export function interactive(state: PressableStateCallbackType, focusColor: string, pressedOpacity = 0.75): ViewStyle[] {
  const s = pressState(state);
  const out: ViewStyle[] = [{ opacity: s.pressed ? pressedOpacity : 1 }];
  if (pointer) out.push(pointer);
  const ring = focusRing(state, focusColor);
  if (ring) out.push(ring);
  return out;
}

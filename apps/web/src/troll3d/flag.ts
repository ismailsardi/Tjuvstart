const FLAG_KEY = 'tjuvstart.troll3d';

/**
 * Whether to show the troll in 3D. Off by default until the artist's model is in: a preview can
 * be switched on with ?troll3d=1 in the address and off again with ?troll3d=0. The choice is
 * remembered on this device.
 */
export function troll3dEnabled(search = window.location.search): boolean {
  try {
    const param = new URLSearchParams(search).get('troll3d');
    if (param === '1') localStorage.setItem(FLAG_KEY, '1');
    if (param === '0') localStorage.removeItem(FLAG_KEY);
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

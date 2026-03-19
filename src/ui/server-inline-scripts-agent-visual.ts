// @ts-nocheck

function renderAgentVisualEnhancerScript() {
    return `<script>
(() => {
  const avatars = Array.from(document.querySelectorAll('.agent-avatar, .staff-avatar'));
  if (!avatars.length) return;
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Pixel motion runs fully on client; no network polling and no extra token usage.

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hexToRgb = (hex) => {
    const safe = (hex || '#4e79a7').replace('#', '').trim();
    if (safe.length !== 6) return { r: 78, g: 121, b: 167 };
    const n = Number.parseInt(safe, 16);
    if (!Number.isFinite(n)) return { r: 78, g: 121, b: 167 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const rgbToHex = (rgb) => '#' + [rgb.r, rgb.g, rgb.b].map((v) => clamp(v, 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, ratio) => {
    const p = clamp(ratio, 0, 1);
    return {
      r: Math.round(a.r + (b.r - a.r) * p),
      g: Math.round(a.g + (b.g - a.g) * p),
      b: Math.round(a.b + (b.b - a.b) * p),
    };
  };
  const lighten = (hex, ratio) => rgbToHex(mix(hexToRgb(hex), { r: 255, g: 255, b: 255 }, ratio));
  const darken = (hex, ratio) => rgbToHex(mix(hexToRgb(hex), { r: 0, g: 0, b: 0 }, ratio));
  const paintHex = (hex, shade) => {
    const rgb = hexToRgb(hex);
    return 'rgb('
      + Math.round(rgb.r * shade) + ','
      + Math.round(rgb.g * shade) + ','
      + Math.round(rgb.b * shade) + ')';
  };
  const spriteSize = 44;
  const createSprite = () => Array.from({ length: spriteSize }, () => Array(spriteSize).fill(''));
  const inBounds = (x, y) => y >= 0 && y < spriteSize && x >= 0 && x < spriteSize;
  const put = (sprite, x, y, color) => {
    if (inBounds(x, y)) sprite[y][x] = color;
  };
  const fillRect = (sprite, x, y, w, h, color) => {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) put(sprite, xx, yy, color);
    }
  };
  const fillEllipse = (sprite, cx, cy, rx, ry, color) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      const ny = (y - cy) / ry;
      if (Math.abs(ny) > 1) continue;
      const span = Math.sqrt(1 - ny * ny) * rx;
      for (let x = Math.floor(cx - span); x <= Math.ceil(cx + span); x += 1) put(sprite, x, y, color);
    }
  };
  const strokeEdge = (sprite, color) => {
    const copy = sprite.map((row) => row.slice());
    const has = (x, y) => inBounds(x, y) && copy[y][x];
    for (let y = 0; y < spriteSize; y += 1) {
      for (let x = 0; x < spriteSize; x += 1) {
        if (!copy[y][x]) continue;
        if (!has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1)) {
          sprite[y][x] = color;
        }
      }
    }
  };
  const dots = (sprite, rows, color) => {
    rows.forEach((row) => {
      row.forEach((point) => put(sprite, point[0], point[1], color));
    });
  };

  const PAL = {
    robot: { outline: '#20394f', shell: '#a7c3d8', shellDark: '#6e8ca4', panel: '#dcecf7', visor: '#58b7ff', visorDark: '#2c7ec0', eye: '#163249', mouth: '#456175', antenna: '#ffd36e' },
    lion: { outline: '#213f57', mane: '#7a4a29', maneHi: '#ad713f', fur: '#d8a56b', face: '#f3d4aa', muzzle: '#f7e3c4', eye: '#1e2d3e', nose: '#7d4f34' },
    tiger: { outline: '#223f59', fur: '#f39b43', furDark: '#d27127', face: '#f9dcba', muzzle: '#fbe8cf', stripe: '#22384d', eye: '#1d2c3c', nose: '#7c4323' },
    panda: { outline: '#223a51', fur: '#f9fcff', furDark: '#24313e', face: '#ffffff', muzzle: '#eef4f8', eyePatch: '#1f2c38', eye: '#101a24', nose: '#5e6b78' },
    monkey: { outline: '#203f57', fur: '#c89235', furDark: '#966521', face: '#f2cf9c', muzzle: '#f8e2bf', eye: '#1d2c3c', nose: '#7a522a' },
    dolphin: { outline: '#20445f', skin: '#59b9e4', skinDark: '#3e93bc', skinHi: '#79ceef', belly: '#def5ff', eye: '#173041' },
    owl: { outline: '#213d55', fur: '#8c6e4f', furDark: '#654c35', face: '#e1caa8', beak: '#e2ab39', eye: '#192734' },
    fox: { outline: '#203d53', fur: '#f28b3a', furDark: '#c66223', face: '#f7d9b8', muzzle: '#fbe8d2', ear: '#f8ad72', eye: '#1b2b38', nose: '#68361f' },
    bear: { outline: '#213b50', fur: '#845d42', furDark: '#61402c', face: '#deb895', muzzle: '#efd4bb', eye: '#172835', nose: '#5f3e2b' },
    eagle: { outline: '#223a53', head: '#f8f9fb', headDark: '#c7ccd2', body: '#7c5d41', wing: '#5f4633', beak: '#e3b744', eye: '#1a2a3a' },
    otter: { outline: '#213d54', fur: '#876047', furDark: '#65452f', face: '#eac6a1', muzzle: '#f3ddc6', eye: '#172736', nose: '#6c4831' },
    rooster: { outline: '#213c54', body: '#fbfcff', wing: '#edf2f8', comb: '#d94c44', wattle: '#c63e38', beak: '#f3bd4e', eye: '#13283a', tail: '#355776', tailHi: '#4d7396' },
    default: { outline: '#223f59', fur: '#8aa7c2', furDark: '#627f9a', face: '#d7e8f7', muzzle: '#e4f0fb', eye: '#172d3f', nose: '#48637a' },
  };

  const drawWhiskers = (sprite, y, color) => {
    fillRect(sprite, 14, y, 6, 1, color);
    fillRect(sprite, 33, y, 6, 1, color);
    fillRect(sprite, 15, y + 2, 5, 1, color);
    fillRect(sprite, 33, y + 2, 5, 1, color);
  };

  const drawCommonMammal = (sprite, p) => {
    const earTone = p.ear || p.furDark || p.fur;
    const muzzleTone = p.muzzle || p.face;
    fillEllipse(sprite, 21, 15, 5, 5, earTone);
    fillEllipse(sprite, 31, 15, 5, 5, earTone);
    fillEllipse(sprite, 26, 21, 14, 12, p.fur);
    fillEllipse(sprite, 26, 18, 9, 5, p.face);
    fillEllipse(sprite, 26, 25, 10, 7, p.face);
    fillEllipse(sprite, 26, 27, 8, 5, muzzleTone);
    fillEllipse(sprite, 26, 36, 9, 7, p.furDark || p.fur);
    fillRect(sprite, 23, 31, 6, 3, p.face);
    fillRect(sprite, 20, 19, 4, 4, '#ffffff');
    fillRect(sprite, 28, 19, 4, 4, '#ffffff');
    fillRect(sprite, 21, 20, 2, 3, p.eye);
    fillRect(sprite, 30, 20, 2, 3, p.eye);
    fillRect(sprite, 22, 20, 1, 1, '#dff0ff');
    fillRect(sprite, 31, 20, 1, 1, '#dff0ff');
    fillRect(sprite, 25, 25, 3, 2, p.nose);
    fillRect(sprite, 24, 27, 5, 1, p.nose);
    fillRect(sprite, 25, 28, 1, 1, p.nose);
    fillRect(sprite, 27, 28, 1, 1, p.nose);
    fillRect(sprite, 25, 30, 1, 1, p.nose);
    fillRect(sprite, 27, 30, 1, 1, p.nose);
    if (p.cheek) {
      fillRect(sprite, 18, 25, 2, 2, p.cheek);
      fillRect(sprite, 33, 25, 2, 2, p.cheek);
    }
  };

  const drawLion = () => {
    const p = PAL.lion;
    const sprite = createSprite();
    const badgeGold = '#f0c562';
    const sashBlue = '#4c7396';
    fillEllipse(sprite, 26, 18, 15, 14, p.mane);
    fillEllipse(sprite, 26, 18, 11, 10, p.maneHi);
    fillEllipse(sprite, 17, 12, 4, 4, p.mane);
    fillEllipse(sprite, 35, 12, 4, 4, p.mane);
    fillEllipse(sprite, 17, 12, 2, 2, p.face);
    fillEllipse(sprite, 35, 12, 2, 2, p.face);
    fillEllipse(sprite, 26, 20, 10, 8, p.fur);
    fillEllipse(sprite, 26, 26, 8, 6, p.muzzle);
    fillEllipse(sprite, 26, 37, 8, 7, p.maneHi);
    fillEllipse(sprite, 20, 33, 5, 5, p.fur);
    fillEllipse(sprite, 32, 31, 5, 5, p.fur);
    fillRect(sprite, 18, 31, 6, 3, p.fur);
    fillRect(sprite, 30, 29, 5, 3, p.fur);
    fillRect(sprite, 21, 18, 3, 3, '#ffffff');
    fillRect(sprite, 29, 18, 3, 3, '#ffffff');
    fillRect(sprite, 22, 19, 1, 2, p.eye);
    fillRect(sprite, 30, 19, 1, 2, p.eye);
    fillRect(sprite, 16, 22, 2, 2, '#f3bc91');
    fillRect(sprite, 34, 22, 2, 2, '#f3bc91');
    fillRect(sprite, 24, 23, 4, 2, p.nose);
    fillRect(sprite, 25, 25, 2, 1, p.nose);
    fillRect(sprite, 24, 26, 1, 1, p.nose);
    fillRect(sprite, 27, 26, 1, 1, p.nose);
    fillRect(sprite, 21, 7, 10, 2, p.maneHi);
    fillRect(sprite, 18, 9, 4, 2, p.maneHi);
    fillRect(sprite, 30, 9, 4, 2, p.maneHi);
    fillRect(sprite, 22, 31, 11, 2, sashBlue);
    fillRect(sprite, 28, 28, 2, 9, sashBlue);
    fillRect(sprite, 24, 35, 4, 4, badgeGold);
    fillRect(sprite, 25, 36, 2, 2, '#fff2c4');
    fillRect(sprite, 32, 24, 3, 6, p.fur);
    fillRect(sprite, 34, 22, 2, 3, p.fur);
    drawWhiskers(sprite, 27, '#f3dfc4');
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const drawRobot = () => {
    const p = PAL.robot;
    const sprite = createSprite();
    fillRect(sprite, 24, 5, 4, 3, p.antenna);
    fillRect(sprite, 25, 8, 2, 3, p.shellDark);
    fillEllipse(sprite, 26, 18, 13, 11, p.shell);
    fillRect(sprite, 15, 12, 22, 14, p.shell);
    fillRect(sprite, 18, 15, 16, 10, p.panel);
    fillRect(sprite, 20, 17, 12, 5, p.visor);
    fillRect(sprite, 22, 18, 2, 2, '#e3f7ff');
    fillRect(sprite, 28, 18, 2, 2, '#e3f7ff');
    fillRect(sprite, 22, 19, 2, 2, p.eye);
    fillRect(sprite, 28, 19, 2, 2, p.eye);
    fillRect(sprite, 24, 24, 4, 1, p.mouth);
    fillRect(sprite, 18, 28, 16, 10, p.shellDark);
    fillRect(sprite, 21, 30, 10, 5, p.panel);
    fillRect(sprite, 23, 31, 2, 2, p.visorDark);
    fillRect(sprite, 27, 31, 2, 2, p.visorDark);
    fillRect(sprite, 25, 34, 2, 2, p.antenna);
    fillRect(sprite, 13, 29, 4, 8, p.shellDark);
    fillRect(sprite, 8, 28, 6, 10, p.visorDark);
    fillRect(sprite, 9, 29, 4, 7, p.panel);
    fillRect(sprite, 35, 20, 3, 9, p.shellDark);
    fillRect(sprite, 37, 15, 3, 6, p.shellDark);
    fillRect(sprite, 38, 12, 3, 3, p.panel);
    fillRect(sprite, 20, 38, 3, 5, p.shellDark);
    fillRect(sprite, 29, 38, 3, 5, p.shellDark);
    fillRect(sprite, 20, 43, 4, 1, p.panel);
    fillRect(sprite, 28, 43, 4, 1, p.panel);
    fillRect(sprite, 20, 12, 12, 1, '#eef8ff');
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const drawTiger = () => {
    const p = PAL.tiger;
    const sprite = createSprite();
    const shieldOuter = '#6f92b3';
    const shieldInner = '#dfeaf5';
    const shieldMark = '#3f6f97';
    fillEllipse(sprite, 21, 18, 13, 12, p.fur);
    fillEllipse(sprite, 13, 11, 3, 4, p.stripe);
    fillEllipse(sprite, 29, 11, 3, 4, p.stripe);
    fillRect(sprite, 13, 10, 2, 3, '#ffd8ba');
    fillRect(sprite, 29, 10, 2, 3, '#ffd8ba');
    fillEllipse(sprite, 21, 21, 10, 8, p.face);
    fillEllipse(sprite, 21, 26, 8, 6, p.muzzle);
    fillEllipse(sprite, 20, 37, 8, 7, p.furDark);
    fillRect(sprite, 16, 30, 9, 5, p.fur);
    fillRect(sprite, 27, 27, 4, 10, p.furDark);
    fillEllipse(sprite, 34, 33, 7, 9, shieldOuter);
    fillEllipse(sprite, 34, 33, 5, 7, shieldInner);
    fillRect(sprite, 32, 31, 5, 1, shieldMark);
    fillRect(sprite, 35, 31, 1, 6, shieldMark);
    fillRect(sprite, 18, 18, 3, 3, '#ffffff');
    fillRect(sprite, 25, 18, 3, 3, '#ffffff');
    fillRect(sprite, 19, 19, 1, 2, p.eye);
    fillRect(sprite, 26, 19, 1, 2, p.eye);
    fillRect(sprite, 12, 22, 2, 2, '#f4af98');
    fillRect(sprite, 28, 22, 2, 2, '#f4af98');
    fillRect(sprite, 19, 23, 4, 2, p.nose);
    fillRect(sprite, 20, 25, 2, 1, p.nose);
    fillRect(sprite, 19, 26, 1, 1, p.nose);
    fillRect(sprite, 22, 26, 1, 1, p.nose);
    dots(
      sprite,
      [
        [[18, 9], [21, 8], [24, 9]],
        [[15, 13], [13, 17], [12, 21], [27, 13], [29, 17], [30, 21]],
        [[16, 16], [25, 16], [15, 25], [26, 25], [18, 36], [23, 36]],
        [[28, 28], [30, 30], [31, 32]],
      ],
      p.stripe,
    );
    dots(
      sprite,
      [
        [[10, 35], [8, 36], [7, 38], [8, 40], [10, 41]],
      ],
      p.furDark,
    );
    drawWhiskers(sprite, 25, '#f4e3d1');
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const drawPanda = () => {
    const p = PAL.panda;
    const sprite = createSprite();
    const laptopShell = '#7d95ab';
    const laptopScreen = '#dceaf5';
    const laptopShadow = '#597286';
    fillEllipse(sprite, 26, 18, 13, 12, p.face);
    fillEllipse(sprite, 18, 12, 4, 4, p.furDark);
    fillEllipse(sprite, 34, 12, 4, 4, p.furDark);
    fillEllipse(sprite, 20, 20, 5, 6, p.eyePatch);
    fillEllipse(sprite, 32, 20, 5, 6, p.eyePatch);
    fillEllipse(sprite, 26, 26, 8, 6, p.muzzle);
    fillEllipse(sprite, 26, 37, 8, 7, p.furDark);
    fillRect(sprite, 17, 30, 18, 9, laptopShell);
    fillRect(sprite, 19, 31, 14, 5, laptopScreen);
    fillRect(sprite, 18, 37, 16, 2, laptopShadow);
    fillRect(sprite, 18, 29, 5, 4, p.furDark);
    fillRect(sprite, 29, 29, 5, 4, p.furDark);
    fillRect(sprite, 21, 18, 3, 3, '#ffffff');
    fillRect(sprite, 29, 18, 3, 3, '#ffffff');
    fillRect(sprite, 22, 19, 1, 2, p.eye);
    fillRect(sprite, 30, 19, 1, 2, p.eye);
    fillRect(sprite, 24, 23, 4, 2, p.nose);
    fillRect(sprite, 25, 25, 2, 1, p.nose);
    fillRect(sprite, 24, 26, 1, 1, p.nose);
    fillRect(sprite, 27, 26, 1, 1, p.nose);
    fillRect(sprite, 21, 33, 10, 1, '#94abc0');
    fillRect(sprite, 23, 35, 6, 1, '#94abc0');
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const drawMonkey = () => {
    const p = PAL.monkey;
    const sprite = createSprite();
    const eyeTone = '#40110f';
    const eyeGlow = '#7e1d18';
    const furHi = '#c58a59';
    const furMid = '#9d603b';
    const blush = '#efb39b';
    fillEllipse(sprite, 14, 20, 5, 6, p.fur);
    fillEllipse(sprite, 38, 20, 5, 6, p.fur);
    fillEllipse(sprite, 14, 20, 3, 4, p.face);
    fillEllipse(sprite, 38, 20, 3, 4, p.face);
    fillEllipse(sprite, 26, 18, 13, 12, p.fur);
    fillEllipse(sprite, 20, 22, 8, 7, p.face);
    fillEllipse(sprite, 32, 22, 8, 7, p.face);
    fillEllipse(sprite, 26, 25, 11, 8, p.face);
    fillEllipse(sprite, 26, 28, 6, 4, p.muzzle);
    fillEllipse(sprite, 26, 38, 7, 7, p.fur);
    fillEllipse(sprite, 26, 39, 4, 5, p.face);
    fillRect(sprite, 19, 34, 3, 7, p.fur);
    fillRect(sprite, 31, 34, 3, 7, p.fur);
    fillRect(sprite, 18, 40, 4, 2, p.face);
    fillRect(sprite, 31, 40, 4, 2, p.face);
    fillRect(sprite, 22, 42, 3, 5, p.fur);
    fillRect(sprite, 27, 42, 3, 5, p.fur);
    fillRect(sprite, 20, 46, 5, 2, p.face);
    fillRect(sprite, 28, 46, 5, 2, p.face);
    fillEllipse(sprite, 20, 22, 3, 4, eyeTone);
    fillEllipse(sprite, 32, 22, 3, 4, eyeTone);
    fillRect(sprite, 18, 19, 2, 2, '#ffffff');
    fillRect(sprite, 30, 19, 2, 2, '#ffffff');
    fillRect(sprite, 21, 23, 1, 1, eyeGlow);
    fillRect(sprite, 33, 23, 1, 1, eyeGlow);
    fillRect(sprite, 16, 25, 2, 2, blush);
    fillRect(sprite, 34, 25, 2, 2, blush);
    fillRect(sprite, 24, 25, 4, 2, p.nose);
    fillRect(sprite, 23, 27, 1, 1, p.nose);
    fillRect(sprite, 28, 27, 1, 1, p.nose);
    dots(sprite, [[[23, 29], [24, 30], [25, 31], [26, 31], [27, 31], [28, 30], [29, 29]]], p.nose);
    dots(sprite, [[[19, 18], [21, 17], [33, 18], [31, 17], [22, 39], [30, 39], [25, 40], [27, 40]]], furHi);
    dots(sprite, [[[13, 20], [39, 20], [14, 23], [38, 23], [20, 45], [24, 45], [29, 45], [32, 45]]], furMid);
    dots(sprite, [[[18, 40], [19, 41], [32, 40], [33, 41]]], '#f5dcc0');
    dots(sprite, [[[21, 47], [23, 47], [29, 47], [31, 47]]], p.nose);
    dots(
      sprite,
      [
        [[22, 12], [23, 10], [24, 8], [26, 7], [28, 8], [30, 9], [31, 11], [30, 14], [32, 13], [34, 10], [35, 9], [36, 10], [35, 13], [33, 15]],
      ],
      p.furDark,
    );
    dots(sprite, [[[25, 10], [27, 9], [29, 11], [31, 13], [20, 13], [18, 15], [23, 14]]], furHi);
    dots(
      sprite,
      [
        [[35, 36], [38, 35], [41, 35], [43, 36], [44, 38], [44, 40], [43, 42], [41, 43], [39, 43], [38, 42], [38, 40], [39, 39], [40, 39], [41, 40], [41, 41], [40, 41]],
      ],
      p.fur,
    );
    dots(sprite, [[[39, 36], [41, 37], [42, 39], [41, 41], [39, 42], [38, 41]]], furHi);
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const drawFox = () => {
    const p = PAL.fox;
    const sprite = createSprite();
    fillEllipse(sprite, 26, 22, 13, 12, p.fur);
    fillRect(sprite, 15, 8, 5, 9, p.furDark);
    fillRect(sprite, 32, 8, 5, 9, p.furDark);
    fillRect(sprite, 17, 10, 2, 5, p.ear);
    fillRect(sprite, 34, 10, 2, 5, p.ear);
    fillEllipse(sprite, 26, 25, 8, 7, p.face);
    fillEllipse(sprite, 26, 28, 7, 4, p.muzzle);
    fillEllipse(sprite, 26, 36, 9, 7, p.furDark);
    fillRect(sprite, 20, 19, 3, 3, '#ffffff');
    fillRect(sprite, 29, 19, 3, 3, '#ffffff');
    fillRect(sprite, 21, 20, 1, 2, p.eye);
    fillRect(sprite, 30, 20, 1, 2, p.eye);
    fillRect(sprite, 25, 25, 3, 2, p.nose);
    fillRect(sprite, 24, 28, 5, 1, p.nose);
    fillRect(sprite, 21, 31, 10, 2, p.muzzle);
    drawWhiskers(sprite, 27, '#f2dfc8');
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const drawBear = () => {
    const p = PAL.bear;
    const sprite = createSprite();
    drawCommonMammal(sprite, { fur: p.fur, furDark: p.furDark, face: p.face, muzzle: p.muzzle, eye: p.eye, nose: p.nose, cheek: '#c8926e' });
    fillEllipse(sprite, 22, 15, 2, 2, p.face);
    fillEllipse(sprite, 30, 15, 2, 2, p.face);
    fillRect(sprite, 23, 34, 6, 2, p.furDark);
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const drawOtter = () => {
    const p = PAL.otter;
    const sprite = createSprite();
    fillEllipse(sprite, 26, 20, 13, 12, p.fur);
    fillEllipse(sprite, 18, 13, 3, 3, p.furDark);
    fillEllipse(sprite, 34, 13, 3, 3, p.furDark);
    fillEllipse(sprite, 18, 13, 2, 2, p.face);
    fillEllipse(sprite, 34, 13, 2, 2, p.face);
    fillEllipse(sprite, 26, 23, 10, 8, p.face);
    fillEllipse(sprite, 26, 28, 8, 6, p.muzzle);
    fillEllipse(sprite, 26, 36, 8, 6, p.furDark);
    fillRect(sprite, 20, 32, 12, 5, p.face);
    fillEllipse(sprite, 19, 31, 5, 5, p.fur);
    fillEllipse(sprite, 33, 31, 5, 5, p.fur);
    fillRect(sprite, 17, 29, 5, 3, p.fur);
    fillRect(sprite, 31, 29, 5, 3, p.fur);
    fillRect(sprite, 21, 20, 3, 3, '#ffffff');
    fillRect(sprite, 29, 20, 3, 3, '#ffffff');
    fillRect(sprite, 22, 21, 1, 2, p.eye);
    fillRect(sprite, 30, 21, 1, 2, p.eye);
    fillRect(sprite, 16, 23, 2, 2, '#f3a2a1');
    fillRect(sprite, 34, 23, 2, 2, '#f3a2a1');
    fillRect(sprite, 24, 25, 4, 2, p.nose);
    fillRect(sprite, 25, 27, 2, 1, p.nose);
    fillRect(sprite, 24, 28, 1, 1, p.nose);
    fillRect(sprite, 27, 28, 1, 1, p.nose);
    fillRect(sprite, 20, 30, 4, 3, p.face);
    fillRect(sprite, 28, 30, 4, 3, p.face);
    fillRect(sprite, 21, 31, 2, 1, p.muzzle);
    fillRect(sprite, 29, 31, 2, 1, p.muzzle);
    fillRect(sprite, 20, 41, 12, 1, '#a9d7ee');
    fillRect(sprite, 23, 40, 6, 1, '#b8e2f5');
    drawWhiskers(sprite, 27, '#f4e7da');
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const drawOwl = () => {
    const p = PAL.owl;
    const sprite = createSprite();
    fillEllipse(sprite, 26, 22, 12, 13, p.fur);
    fillEllipse(sprite, 20, 11, 3, 3, p.furDark);
    fillEllipse(sprite, 32, 11, 3, 3, p.furDark);
    fillEllipse(sprite, 26, 36, 9, 7, p.furDark);
    fillEllipse(sprite, 20, 22, 5, 5, p.face);
    fillEllipse(sprite, 32, 22, 5, 5, p.face);
    fillRect(sprite, 18, 20, 4, 4, '#ffffff');
    fillRect(sprite, 30, 20, 4, 4, '#ffffff');
    fillRect(sprite, 19, 21, 2, 2, p.eye);
    fillRect(sprite, 31, 21, 2, 2, p.eye);
    fillRect(sprite, 25, 25, 2, 2, p.beak);
    fillRect(sprite, 24, 28, 5, 1, p.furDark);
    dots(sprite, [[[17, 27], [35, 27], [19, 30], [33, 30], [22, 33], [30, 33]]], p.face);
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const drawDolphin = () => {
    const p = PAL.dolphin;
    const sprite = createSprite();
    const splash = '#8dd9ff';
    const splashHi = '#def6ff';
    fillEllipse(sprite, 24, 20, 12, 8, p.skin);
    fillEllipse(sprite, 22, 18, 7, 4, p.skinHi);
    fillEllipse(sprite, 22, 23, 7, 4, p.belly);
    fillRect(sprite, 31, 17, 8, 5, p.skin);
    fillRect(sprite, 35, 16, 5, 2, p.skinDark);
    fillRect(sprite, 35, 21, 5, 2, p.skinDark);
    fillRect(sprite, 23, 9, 5, 6, p.skinDark);
    fillRect(sprite, 17, 27, 6, 4, p.skinDark);
    fillRect(sprite, 14, 18, 5, 3, p.skinDark);
    fillRect(sprite, 9, 14, 5, 4, p.skinDark);
    fillRect(sprite, 9, 22, 5, 4, p.skinDark);
    fillRect(sprite, 28, 18, 3, 3, '#ffffff');
    fillRect(sprite, 29, 19, 1, 2, p.eye);
    fillRect(sprite, 29, 23, 2, 2, '#f4a4b0');
    fillRect(sprite, 21, 25, 12, 1, p.skinDark);
    fillRect(sprite, 31, 12, 2, 3, splashHi);
    fillRect(sprite, 33, 10, 2, 2, splashHi);
    fillEllipse(sprite, 24, 37, 10, 4, splash);
    fillRect(sprite, 16, 38, 3, 2, splashHi);
    fillRect(sprite, 22, 39, 3, 2, splashHi);
    fillRect(sprite, 29, 38, 3, 2, splashHi);
    fillRect(sprite, 34, 36, 2, 3, splash);
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const drawEagle = () => {
    const p = PAL.eagle;
    const sprite = createSprite();
    fillEllipse(sprite, 26, 21, 12, 11, p.head);
    fillEllipse(sprite, 26, 16, 10, 6, p.headDark);
    fillEllipse(sprite, 26, 36, 10, 7, p.body);
    fillRect(sprite, 19, 33, 14, 3, p.wing);
    fillRect(sprite, 33, 23, 7, 3, p.beak);
    fillRect(sprite, 38, 22, 2, 2, p.beak);
    fillRect(sprite, 24, 20, 3, 3, '#ffffff');
    fillRect(sprite, 25, 21, 1, 1, p.eye);
    fillRect(sprite, 23, 28, 6, 2, p.headDark);
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const drawRooster = () => {
    const p = PAL.rooster;
    const sprite = createSprite();
    fillEllipse(sprite, 26, 22, 12, 11, p.body);
    fillEllipse(sprite, 26, 36, 9, 7, p.wing);
    fillRect(sprite, 22, 8, 3, 6, p.comb);
    fillRect(sprite, 25, 6, 3, 8, p.comb);
    fillRect(sprite, 28, 9, 3, 6, p.comb);
    fillRect(sprite, 32, 25, 3, 3, p.wattle);
    fillRect(sprite, 33, 23, 6, 3, p.beak);
    fillRect(sprite, 15, 14, 3, 10, p.tail);
    fillRect(sprite, 13, 16, 2, 8, p.tailHi);
    fillRect(sprite, 16, 12, 2, 4, p.tailHi);
    fillRect(sprite, 23, 20, 3, 3, '#ffffff');
    fillRect(sprite, 24, 21, 1, 1, p.eye);
    fillRect(sprite, 21, 33, 10, 2, p.wing);
    strokeEdge(sprite, p.outline);
    return sprite;
  };

  const spriteFactory = {
    robot: drawRobot,
    lion: drawLion,
    tiger: drawTiger,
    panda: drawPanda,
    monkey: drawMonkey,
    fox: drawFox,
    bear: drawBear,
    otter: drawOtter,
    owl: drawOwl,
    dolphin: drawDolphin,
    eagle: drawEagle,
    rooster: drawRooster,
    default: drawBear,
  };

  const spriteCache = new Map();
  const getSprite = (animal) => {
    const key = (animal || 'default').trim().toLowerCase();
    if (!spriteCache.has(key)) {
      const renderer = spriteFactory[key] || spriteFactory.default;
      spriteCache.set(key, renderer());
    }
    return spriteCache.get(key);
  };
  const spriteBoundsCache = new Map();
  const computeSpriteBounds = (sprite) => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let y = 0; y < sprite.length; y += 1) {
      for (let x = 0; x < sprite[y].length; x += 1) {
        if (!sprite[y][x]) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return { minX: 0, minY: 0, maxX: sprite.length - 1, maxY: sprite.length - 1, width: sprite.length, height: sprite.length, span: sprite.length };
    }
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    return { minX, minY, maxX, maxY, width, height, span: Math.max(width, height) };
  };
  const getSpriteBounds = (animal, sprite) => {
    const key = (animal || 'default').trim().toLowerCase();
    if (!spriteBoundsCache.has(key)) {
      spriteBoundsCache.set(key, computeSpriteBounds(sprite));
    }
    return spriteBoundsCache.get(key);
  };
  const spriteVisualSpanCompensation = {
    lion: 0.92,
    otter: 0.9,
  };

  const render = (canvas, animal, accent, motion) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bob = motion && Number.isFinite(motion.bob) ? motion.bob : 0;
    const sway = motion && Number.isFinite(motion.sway) ? motion.sway : 0;
    const blink = motion && Number.isFinite(motion.blink) ? motion.blink : 0;
    const auraA = lighten(accent, 0.6);
    const auraB = lighten(accent, 0.9);
    const panelLine = darken(accent, 0.33);
    const shadowTone = darken(accent, 0.52);
    const g = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.38,
      8,
      canvas.width * 0.5,
      canvas.height * 0.44,
      canvas.width * 0.5,
    );
    g.addColorStop(0, auraA);
    g.addColorStop(1, auraB);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sprite = getSprite(animal);
    const gridSize = sprite.length;
    const bounds = getSpriteBounds(animal, sprite);
    const squareSpan = bounds.span;
    const spanCompensation = spriteVisualSpanCompensation[animal] || 1;
    const effectiveSpan = Math.max(1, squareSpan * spanCompensation);
    const scale = Math.max(2, Math.floor(Math.min((canvas.width - 26) / effectiveSpan, (canvas.height - 24) / effectiveSpan)));
    const panelSize = squareSpan * scale;
    const visibleW = bounds.width * scale;
    const visibleH = bounds.height * scale;
    const panelX = Math.floor((canvas.width - panelSize) / 2) + sway;
    const panelY = Math.floor((canvas.height - panelSize) / 2) - 1 + bob;
    const visibleX = panelX + Math.floor((panelSize - visibleW) / 2);
    const visibleY = panelY + Math.floor((panelSize - visibleH) / 2);
    const ox = visibleX - bounds.minX * scale;
    const oy = visibleY - bounds.minY * scale;

    const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelSize);
    panelGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
    panelGrad.addColorStop(1, 'rgba(255,255,255,0.42)');
    ctx.fillStyle = panelGrad;
    ctx.fillRect(panelX - 4, panelY - 4, panelSize + 8, panelSize + 8);
    ctx.strokeStyle = panelLine;
    ctx.globalAlpha = 0.14;
    ctx.strokeRect(panelX - 4.5, panelY - 4.5, panelSize + 9, panelSize + 9);
    ctx.globalAlpha = 1;

    const hasPixel = (x, y) => y >= 0 && y < gridSize && x >= 0 && x < gridSize && sprite[y][x];
    const outlineColor = (PAL[animal] && PAL[animal].outline) || PAL.default.outline;
    for (let gy = 0; gy < gridSize; gy += 1) {
      for (let gx = 0; gx < gridSize; gx += 1) {
        if (!sprite[gy][gx]) continue;
        const edge =
          !hasPixel(gx - 1, gy) ||
          !hasPixel(gx + 1, gy) ||
          !hasPixel(gx, gy - 1) ||
          !hasPixel(gx, gy + 1);
        if (edge) {
          ctx.fillStyle = shadowTone;
          ctx.globalAlpha = 0.32;
          ctx.fillRect(ox + gx * scale + 1, oy + gy * scale + 1, scale - 0.16, scale - 0.16);
          ctx.globalAlpha = 1;
          ctx.fillStyle = outlineColor;
          ctx.fillRect(ox + gx * scale, oy + gy * scale, scale - 0.08, scale - 0.08);
          ctx.globalAlpha = 1;
        }
      }
    }

    for (let gy = 0; gy < gridSize; gy += 1) {
      for (let gx = 0; gx < gridSize; gx += 1) {
        const color = sprite[gy][gx];
        if (!color) continue;
        const verticalShade = 1 - (gy / gridSize) * 0.09;
        const centerBias = 1 - Math.abs(gx - gridSize * 0.5) / (gridSize * 9.5);
        const shade = clamp(verticalShade * centerBias, 0.82, 1.06);
        ctx.fillStyle = paintHex(color, shade);
        ctx.fillRect(ox + gx * scale, oy + gy * scale, scale - 0.08, scale - 0.08);
        if ((gx + gy) % 6 === 2 && gy < gridSize * 0.72) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(255,255,255,0.17)';
          ctx.fillRect(ox + gx * scale, oy + gy * scale, Math.max(1, scale - 1.2), Math.max(1, scale - 1.2));
        }
      }
    }

    if (blink > 0.5) {
      const blinkY = visibleY + Math.floor(visibleH * 0.42);
      const blinkX = visibleX + Math.floor(visibleW * 0.24);
      const blinkW = Math.max(2, Math.floor(visibleW * 0.45));
      const blinkH = Math.max(1, Math.floor(scale * 0.85));
      ctx.fillStyle = 'rgba(23, 47, 66, 0.6)';
      ctx.fillRect(blinkX, blinkY, blinkW, blinkH);
    }

    ctx.fillStyle = 'rgba(20, 64, 90, 0.12)';
    ctx.fillRect(
      visibleX + Math.floor(visibleW * 0.28),
      visibleY + visibleH - scale * 2 + Math.max(0, bob),
      Math.max(2, Math.floor(visibleW * 0.44)),
      Math.max(2, scale * 1.3),
    );
  };

  const hashSeed = (input) => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash * 33 + input.charCodeAt(i)) >>> 0;
    }
    return hash / 0xffffffff;
  };

  const motionActors = [];
  const motionProfiles = {
    robot: { bobAmp: 1.2, swayAmp: 0.9, bobFreq: 1.0, swayFreq: 0.82, blinkThreshold: 0.988 },
    lion: { bobAmp: 1.0, swayAmp: 0.8, bobFreq: 0.88, swayFreq: 0.76, blinkThreshold: 0.992 },
    tiger: { bobAmp: 1.15, swayAmp: 1.0, bobFreq: 0.96, swayFreq: 0.86, blinkThreshold: 0.989 },
    panda: { bobAmp: 0.8, swayAmp: 0.55, bobFreq: 0.8, swayFreq: 0.72, blinkThreshold: 0.994 },
    monkey: { bobAmp: 1.45, swayAmp: 1.35, bobFreq: 1.12, swayFreq: 0.94, blinkThreshold: 0.986 },
    dolphin: { bobAmp: 1.7, swayAmp: 1.55, bobFreq: 1.18, swayFreq: 1.02, blinkThreshold: 0.993 },
    otter: { bobAmp: 1.15, swayAmp: 0.95, bobFreq: 0.98, swayFreq: 0.84, blinkThreshold: 0.989 },
    rooster: { bobAmp: 1.3, swayAmp: 0.7, bobFreq: 1.06, swayFreq: 0.72, blinkThreshold: 0.991 },
    default: { bobAmp: 1.1, swayAmp: 0.9, bobFreq: 0.95, swayFreq: 0.82, blinkThreshold: 0.99 },
  };
  avatars.forEach((avatar, index) => {
    const canvas = avatar.querySelector('.agent-pixel-canvas');
    if (!canvas) return;
    const accent = getComputedStyle(avatar).getPropertyValue('--agent-accent').trim() || '#4e79a7';
    const animal = (avatar.dataset.animal || 'default').trim().toLowerCase();
    motionActors.push({
      canvas,
      accent,
      animal,
      seed: hashSeed(animal + ':' + accent + ':' + String(index + 1)),
    });
  });

  if (motionActors.length === 0) return;

  if (prefersReducedMotion) {
    motionActors.forEach((actor) => {
      render(actor.canvas, actor.animal, actor.accent, { bob: 0, sway: 0, blink: 0 });
    });
    return;
  }

  const step = (now) => {
    motionActors.forEach((actor) => {
      const profile = motionProfiles[actor.animal] || motionProfiles.default;
      const phase = now * 0.0032 * profile.bobFreq + actor.seed * 9.7;
      const bob = Math.round(Math.sin(phase) * profile.bobAmp);
      const sway = Math.round(Math.cos(phase * profile.swayFreq) * profile.swayAmp);
      const blinkSignal = Math.sin(now * 0.012 + actor.seed * 27);
      const blink = blinkSignal > profile.blinkThreshold ? 1 : 0;
      render(actor.canvas, actor.animal, actor.accent, { bob, sway, blink });
    });
    window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
})();
</script>`;
}

export { renderAgentVisualEnhancerScript };

import * as THREE from 'three';
import { COURT } from './court.js';
import { applyFrameInstant } from './play.js';

// Arremesso: lança a bola num arco até o aro mais próximo, com giro,
// flash do aro e balanço da rede. É um floreio VISUAL e NÃO-destrutivo:
// ao terminar, a bola volta exatamente para o estado do quadro atual.
export function initShot(app) {
  const lerp = (a, b, t) => a + (b - a) * t;
  let anim = null; // animação de arremesso em andamento (ou null)

  // Aro mais próximo da bola. Em meia quadra só existe o de z = basketZ;
  // na quadra inteira há o oposto em z = courtLength - basketZ.
  function nearestHoop(ballZ) {
    const near = COURT.basketZ;
    const far = app.state.courtLength - COURT.basketZ;
    const useFar = app.state.mode === 'full' &&
      Math.abs(ballZ - far) < Math.abs(ballZ - near);
    return { x: 0, y: COURT.basketH, z: useFar ? far : near };
  }

  // Encontra aro/rede mais próximos do alvo (há 2 na quadra inteira)
  function rimPartsNear(z) {
    let glow = null, net = null, gd = Infinity, nd = Infinity;
    const wp = new THREE.Vector3();
    app.courtGroup?.traverse((o) => {
      if (o.name !== 'rimGlow' && o.name !== 'net') return;
      o.getWorldPosition(wp);
      const d = Math.abs(wp.z - z);
      if (o.name === 'rimGlow' && d < gd) { gd = d; glow = o; }
      if (o.name === 'net' && d < nd) { nd = d; net = o; }
    });
    return { glow, net };
  }

  // Dispara o arremesso a partir da posição atual da bola
  app.shootBall = () => {
    if (app.state.playing || anim) return false; // não durante a reprodução / outro arremesso
    const ball = app.actors.get('BALL').mesh;
    const start = ball.position.clone();
    const hoop = nearestHoop(start.z);
    const dist = Math.hypot(hoop.x - start.x, hoop.z - start.z);
    const arcH = Math.max(hoop.y + 1.4, Math.max(start.y, hoop.y) + dist * 0.45 + 1.2);
    anim = {
      ball,
      start,
      hoop,
      arcH,
      flightDur: 0.55 + Math.min(dist * 0.045, 0.65),
      swishDur: 0.45,
      t: 0,
      phase: 'flight',
      parts: rimPartsNear(hoop.z),
    };
    return true;
  };

  // Chamado a cada frame pelo loop principal
  app.updateShot = (dt) => {
    if (!anim) return;
    const { ball, start, hoop } = anim;

    if (anim.phase === 'flight') {
      anim.t += dt / anim.flightDur;
      const t = Math.min(anim.t, 1);
      const x = lerp(start.x, hoop.x, t);
      const z = lerp(start.z, hoop.z, t);
      const chordY = lerp(start.y, hoop.y, t);
      const peak = anim.arcH - (start.y + hoop.y) / 2; // altura do arco sobre a corda
      ball.position.set(x, chordY + 4 * peak * t * (1 - t), z);
      ball.rotation.x -= dt * 9; // giro de backspin

      if (t >= 1) { // chegou ao aro → cesta
        anim.phase = 'swish';
        anim.t = 0;
        if (anim.parts.glow) anim.parts.glow.material.opacity = 1.4;
      }
    } else { // 'swish': cai pela rede e some o brilho
      anim.t += dt / anim.swishDur;
      const t = Math.min(anim.t, 1);
      ball.position.set(hoop.x, hoop.y - 1.0 * t, hoop.z); // desce ~1 m pela rede
      ball.rotation.x -= dt * 6;
      if (anim.parts.glow) anim.parts.glow.material.opacity = lerp(1.4, 0.4, t);
      if (anim.parts.net) anim.parts.net.position.y = hoop.y - 0.2 - 0.12 * Math.sin(t * Math.PI);

      if (t >= 1) { // fim: restaura aro e bola (não-destrutivo)
        if (anim.parts.glow) anim.parts.glow.material.opacity = 0.4;
        if (anim.parts.net) anim.parts.net.position.y = hoop.y - 0.2;
        ball.rotation.set(0, 0, 0);
        applyFrameInstant(app, app.state.currentFrame);
        anim = null;
        app.onShotEnd?.();
      }
    }
  };
}

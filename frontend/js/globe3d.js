/**
 * EcoTrack 3D Globe – Canvas-based animated globe with particles.
 * Renders on #globe3d and a full-bg particle field on #ecoCanvas.
 */
(function () {
  /* ── Background particle field ── */
  const bg = document.getElementById("ecoCanvas");
  if (bg) {
    const ctx = bg.getContext("2d");
    let W, H, particles = [];

    function resizeBg() {
      W = bg.width = bg.offsetWidth || window.innerWidth;
      H = bg.height = bg.offsetHeight || window.innerHeight;
      bg.style.width = "100%";
      bg.style.height = "100%";
    }

    function mkParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.8 + 0.4,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        a: Math.random() * 0.6 + 0.1,
      };
    }

    function initParticles() {
      particles = [];
      const n = Math.min(140, Math.floor((W * H) / 8000));
      for (let i = 0; i < n; i++) particles.push(mkParticle());
    }

    function drawBg() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(function (p) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(37,216,130," + p.a + ")";
        ctx.fill();
      });
      // Connect nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = "rgba(37,216,130," + (0.08 * (1 - d / 100)) + ")";
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(drawBg);
    }

    resizeBg(); initParticles(); drawBg();
    window.addEventListener("resize", function () { resizeBg(); initParticles(); });
  }

  /* ── 3D Globe ── */
  const gc = document.getElementById("globe3d");
  if (!gc) return;
  const gx = gc.getContext("2d");
  const SIZE = gc.width;
  const CX = SIZE / 2, CY = SIZE / 2, R = SIZE * 0.42;
  let angle = 0;

  // Approximate continent outlines as lat/lon points
  const landDots = [];
  for (let lat = -85; lat <= 85; lat += 4) {
    for (let lon = -180; lon <= 180; lon += 4) {
      // Simple land mask (rough approximation)
      if (isLand(lat, lon)) {
        landDots.push({ lat: lat * Math.PI / 180, lon: lon * Math.PI / 180 });
      }
    }
  }

  function isLand(lat, lon) {
    // Africa
    if (lat >= -35 && lat <= 37 && lon >= -18 && lon <= 52) return true;
    // Europe
    if (lat >= 36 && lat <= 71 && lon >= -10 && lon <= 40) return true;
    // Asia
    if (lat >= 10 && lat <= 75 && lon >= 40 && lon <= 145) return true;
    // North America
    if (lat >= 15 && lat <= 75 && lon >= -140 && lon <= -55) return true;
    // South America
    if (lat >= -55 && lat <= 13 && lon >= -82 && lon <= -34) return true;
    // Australia
    if (lat >= -40 && lat <= -10 && lon >= 113 && lon <= 155) return true;
    return false;
  }

  function projectDot(latRad, lonRad, rot) {
    const adjustedLon = lonRad + rot;
    const x = CX + R * Math.cos(latRad) * Math.sin(adjustedLon);
    const y = CY - R * Math.sin(latRad);
    const z = Math.cos(latRad) * Math.cos(adjustedLon);
    return { x, y, z };
  }

  function drawGlobe() {
    gx.clearRect(0, 0, SIZE, SIZE);

    // Outer glow
    const outerGlow = gx.createRadialGradient(CX, CY, R * 0.8, CX, CY, R * 1.15);
    outerGlow.addColorStop(0, "rgba(37,216,130,0)");
    outerGlow.addColorStop(1, "rgba(37,216,130,0.18)");
    gx.beginPath();
    gx.arc(CX, CY, R * 1.15, 0, Math.PI * 2);
    gx.fillStyle = outerGlow;
    gx.fill();

    // Ocean
    const ocean = gx.createRadialGradient(CX - R * 0.25, CY - R * 0.25, 0, CX, CY, R);
    ocean.addColorStop(0, "#1a5c3a");
    ocean.addColorStop(0.6, "#0f3d24");
    ocean.addColorStop(1, "#071c12");
    gx.beginPath();
    gx.arc(CX, CY, R, 0, Math.PI * 2);
    gx.fillStyle = ocean;
    gx.fill();

    // Grid lines (latitude)
    gx.strokeStyle = "rgba(37,216,130,0.08)";
    gx.lineWidth = 0.5;
    for (let la = -60; la <= 60; la += 30) {
      const latR = la * Math.PI / 180;
      const cosLat = Math.cos(latR);
      const sinLat = Math.sin(latR);
      gx.beginPath();
      for (let lo = 0; lo <= 360; lo += 2) {
        const loR = (lo * Math.PI / 180) + angle;
        const px = CX + R * cosLat * Math.sin(loR);
        const py = CY - R * sinLat;
        const z = cosLat * Math.cos(loR);
        if (z > 0) {
          if (lo === 0 || (lo > 0 && cosLat * Math.cos(((lo - 2) * Math.PI / 180) + angle) <= 0)) {
            gx.moveTo(px, py);
          } else {
            gx.lineTo(px, py);
          }
        }
      }
      gx.stroke();
    }

    // Land dots
    landDots.forEach(function (d) {
      const p = projectDot(d.lat, d.lon, angle);
      if (p.z > 0) {
        const brightness = 0.4 + p.z * 0.6;
        gx.beginPath();
        gx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        gx.fillStyle = "rgba(37,216,130," + brightness + ")";
        gx.fill();
      }
    });

    // Specular highlight
    const spec = gx.createRadialGradient(CX - R * 0.3, CY - R * 0.3, 0, CX, CY, R);
    spec.addColorStop(0, "rgba(255,255,255,0.12)");
    spec.addColorStop(0.5, "rgba(255,255,255,0)");
    gx.beginPath();
    gx.arc(CX, CY, R, 0, Math.PI * 2);
    gx.fillStyle = spec;
    gx.fill();

    // Atmosphere ring
    gx.beginPath();
    gx.arc(CX, CY, R, 0, Math.PI * 2);
    gx.strokeStyle = "rgba(37,216,130,0.35)";
    gx.lineWidth = 2;
    gx.stroke();

    angle += 0.004;
    requestAnimationFrame(drawGlobe);
  }

  drawGlobe();
})();

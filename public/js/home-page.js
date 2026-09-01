const hero = document.querySelector(".hero-home");
const canvas = hero?.querySelector(".hero-particle-canvas");

if (!hero || !canvas) {
  // Home-only interaction script exits on non-home pages.
} else {
  const context = canvas.getContext("2d");
  if (!context) {
    // Skip animation if canvas context cannot initialize.
  } else {
    let animationId = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const pointer = {
      x: -1000,
      y: -1000,
      active: false,
      radius: 130
    };

    const particleCount = window.matchMedia("(max-width: 740px)").matches ? 26 : 48;
    const particles = [];

    const makeParticle = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.26,
      vy: (Math.random() - 0.5) * 0.26,
      size: 1 + Math.random() * 2.3,
      alpha: 0.2 + Math.random() * 0.45
    });

    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i += 1) {
        particles.push(makeParticle());
      }
    };

    const resize = () => {
      const rect = hero.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      initParticles();
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);

          if (distance > 120) continue;
          const opacity = (1 - distance / 120) * 0.14;
          context.strokeStyle = `rgba(130, 212, 255, ${opacity.toFixed(3)})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }
    };

    const updateAndDraw = () => {
      context.clearRect(0, 0, width, height);

      const glow = context.createRadialGradient(pointer.x, pointer.y, 4, pointer.x, pointer.y, 170);
      glow.addColorStop(0, "rgba(130, 236, 214, 0.18)");
      glow.addColorStop(1, "rgba(130, 236, 214, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;

        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          if (distance < pointer.radius) {
            const force = (pointer.radius - distance) / pointer.radius;
            particle.x += (dx / distance) * force * 1.5;
            particle.y += (dy / distance) * force * 1.5;
          }
        }

        context.beginPath();
        context.fillStyle = `rgba(145, 215, 255, ${particle.alpha.toFixed(3)})`;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      drawConnections();
      animationId = window.requestAnimationFrame(updateAndDraw);
    };

    const pointerMove = (event) => {
      const rect = hero.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };

    const pointerLeave = () => {
      pointer.active = false;
      pointer.x = -1000;
      pointer.y = -1000;
    };

    resize();
    animationId = window.requestAnimationFrame(updateAndDraw);

    hero.addEventListener("pointermove", pointerMove);
    hero.addEventListener("pointerleave", pointerLeave);
    window.addEventListener("resize", resize);

    window.addEventListener("beforeunload", () => {
      if (animationId) window.cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      hero.removeEventListener("pointermove", pointerMove);
      hero.removeEventListener("pointerleave", pointerLeave);
    });
  }
}

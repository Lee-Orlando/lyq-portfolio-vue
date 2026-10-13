<script setup>
/**
 * 首屏的粒子连线背景。
 *
 * 三个省电细节都是从原生版搬过来的，别在重写时丢掉：
 *   1. 系统开了「减少动态效果」就只画一帧静态星空，不启动动画循环
 *   2. 标签页切到后台时停掉 requestAnimationFrame
 *   3. 首屏滚出视口后停止绘制（IntersectionObserver）
 */
import { onMounted, onBeforeUnmount, ref } from 'vue';

const CONFIG = {
    count: 80,
    color: '#ffd700',
    lineColor: '#ffd700',
    lineDistance: 150,
    lineWidth: 1,
    baseOpacity: 0.5,
    radius: 3,
    speed: 2
};

const host = ref(null);

let canvas = null;
let ctx = null;
let particles = [];
let width = 0;
let height = 0;
let frameId = null;
let resizeObserver = null;
let visibilityObserver = null;

const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resize() {
    if (!host.value || !canvas) return;
    width = host.value.offsetWidth;
    height = host.value.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function seed() {
    particles = Array.from({ length: CONFIG.count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = (Math.random() + 0.2) * CONFIG.speed;
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            radius: Math.random() * CONFIG.radius + CONFIG.radius / 2,
            opacity: Math.random() * CONFIG.baseOpacity + 0.1
        };
    });
}

function step() {
    for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0 || p.x >= width) p.vx *= -1;
        if (p.y <= 0 || p.y >= height) p.vy *= -1;
    }
}

function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
    }

    const { lineDistance, lineColor, lineWidth } = CONFIG;
    for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist >= lineDistance) continue;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = lineWidth;
            ctx.globalAlpha = 0.4 * (1 - dist / lineDistance);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1;
}

function loop() {
    step();
    draw();
    frameId = window.requestAnimationFrame(loop);
}

function start() {
    if (frameId !== null) return;
    loop();
}

function stop() {
    if (frameId === null) return;
    window.cancelAnimationFrame(frameId);
    frameId = null;
}

function onVisibility() {
    if (document.hidden) stop();
    else if (!prefersReducedMotion) start();
}

let resizeTimer = null;

onMounted(() => {
    if (!host.value) return;
    canvas = document.createElement('canvas');
    host.value.appendChild(canvas);
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    resize();
    seed();
    draw();

    if (prefersReducedMotion) return;

    start();
    document.addEventListener('visibilitychange', onVisibility);

    // 首屏滚出视口就停，别在用户看不到的地方烧 CPU
    visibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) start();
            else stop();
        });
    }, { threshold: 0 });
    visibilityObserver.observe(host.value);

    resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resize();
            seed();
            draw();
        }, 150);
    });
    resizeObserver.observe(host.value);
});

onBeforeUnmount(() => {
    stop();
    clearTimeout(resizeTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    if (visibilityObserver) visibilityObserver.disconnect();
    if (resizeObserver) resizeObserver.disconnect();
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
});
</script>

<!-- id 保留成 particles-js：样式表里那条 z-index:-1 的定位规则挂在它上面，改名背景会被内容盖住 -->
<template>
    <div id="particles-js" ref="host" aria-hidden="true"></div>
</template>

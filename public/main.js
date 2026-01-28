const canvas = document.getElementById('drone-canvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');
const progressFill = document.getElementById('progress-fill');

// Configuration
const frameCount = 40;
const currentFrame = { index: 0 };
const images = [];
const framesLoaded = 0;

// Set Canvas Size
// We make the canvas match the viewport size exactly to facilitate easy drawing
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render(); // Re-render on resize
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Init

// Image Preload
const preloadImages = () => {
    let loadedCount = 0;

    for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        // Exact format: frame-001 (1).jpg, frame-001 (20).jpg, etc.
        img.src = `./assets/frames/frame-001 (${i}).jpg`;

        img.onload = () => {
            loadedCount++;
            const percent = (loadedCount / frameCount) * 100;
            progressFill.style.width = `${percent}%`;

            if (loadedCount === frameCount) {
                // Determine if we actually have frames (fallback for dev)
                // If frame 2 failed to load (404), we handle it in onError usually, 
                // but here we just wait for all that CAN load.
                setTimeout(initAnimation, 500);
            }
        };

        img.onerror = () => {
            // Graceful degradation for missing frames in development
            // If frame 2 is missing, we just count it as loaded to not block the app
            console.warn(`Frame ${i} missing, skipping.`);
            loadedCount++;
            if (loadedCount === frameCount) setTimeout(initAnimation, 500);
        };

        images.push(img);
    }

    // Fallback: If no images load (e.g. correct path but files missing) after 3s, force start
    setTimeout(() => {
        if (!loader.classList.contains('hidden')) {
            console.log("Force starting animation...");
            initAnimation();
        }
    }, 3000);
};

function initAnimation() {
    loader.classList.add('hidden');
    loop(); // Start the animation loop
}

// Smooth Scroll State
let targetProgress = 0;
let smoothedProgress = 0;

// Draw the current frame to the canvas
// blending between two frames for smoothness
function render(progress) {
    // Map progress (0..1) to frame index (0..39)
    const floatIndex = progress * (frameCount - 1);
    const index1 = Math.floor(floatIndex);
    const index2 = Math.min(frameCount - 1, Math.ceil(floatIndex));
    const blend = floatIndex - index1; // Decimal part for opacity

    const img1 = images[index1];
    const img2 = images[index2];

    // Clear once
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // OPTIMIZATION: If blend is very close to 0 or 1, don't double-render
    if (blend < 0.01) {
        if (img1 && img1.complete && img1.naturalWidth !== 0) {
            ctx.globalAlpha = 1;
            drawFrame(img1);
        }
    } else if (blend > 0.99) {
        if (img2 && img2.complete && img2.naturalWidth !== 0) {
            ctx.globalAlpha = 1;
            drawFrame(img2);
        }
    } else {
        // Draw first frame (base)
        if (img1 && img1.complete && img1.naturalWidth !== 0) {
            ctx.globalAlpha = 1;
            drawFrame(img1);
        }

        // Draw second frame (overlay with opacity)
        if (index1 !== index2 && img2 && img2.complete && img2.naturalWidth !== 0) {
            ctx.globalAlpha = blend;
            drawFrame(img2);
        }
    }

    // Reset Alpha
    ctx.globalAlpha = 1;
}

function drawFrame(img) {
    const hRatio = canvas.width / img.width;
    const vRatio = canvas.height / img.height;
    const ratio = Math.min(hRatio, vRatio); // Contain fit

    const centerShift_x = (canvas.width - img.width * ratio) / 2;
    const centerShift_y = (canvas.height - img.height * ratio) / 2;

    ctx.drawImage(img,
        0, 0, img.width, img.height,
        centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
    );
}

// Animation Loop
function loop() {
    // Linear Interpolation (Lerp) for smooth momentum
    // INCREASED SPEED: 0.15 (was 0.08) for snappier response
    smoothedProgress += (targetProgress - smoothedProgress) * 0.15;

    render(smoothedProgress);
    updateTextOverlays(smoothedProgress);
    updateLighting(smoothedProgress);

    requestAnimationFrame(loop);
}

// Scroll Handling
window.addEventListener('scroll', () => {
    const html = document.documentElement;
    const scrollContainer = document.querySelector('.scroll-container');
    const maxScrollTop = scrollContainer.scrollHeight - window.innerHeight;
    const scrollTop = html.scrollTop;
    const scrollFraction = scrollTop / maxScrollTop;

    // Update Target only
    targetProgress = Math.min(1, Math.max(0, scrollFraction));
});

function updateLighting(progress) {
    const light = document.getElementById('ambient-light');

    // Logic: 
    // 0.0 - 0.2: Start dim (System idle)
    // 0.2 - 0.5: Brighten (Power up / Expansion)
    // 0.5 - 0.8: Peak Brightness (Exploded view)
    // 0.8 - 1.0: Dim (Reassembly)

    let opacity = 0.4;

    if (progress < 0.2) {
        opacity = 0.3 + (progress * 0.5); // 0.3 -> 0.4
    } else if (progress >= 0.2 && progress < 0.5) {
        opacity = 0.4 + ((progress - 0.2) * 1.5); // 0.4 -> 0.85 (Peak)
    } else if (progress >= 0.5 && progress < 0.8) {
        opacity = 0.85 - ((progress - 0.5) * 0.5); // 0.85 -> 0.7
    } else {
        opacity = 0.7 - ((progress - 0.8) * 1.5); // 0.7 -> 0.4
    }

    light.style.opacity = opacity;
    light.style.transform = `translate(-50%, -50%) scale(${1 + progress * 0.2})`;
}

function updateTextOverlays(progress) {
    const p = progress * 100; // 0 to 100

    const toggle = (id, active) => {
        const el = document.getElementById(id);
        if (el) {
            if (active) el.classList.add('active');
            else el.classList.remove('active');
        }
    };

    // 0–15%: Intro
    toggle('overlay-1', p >= 0 && p < 20);

    // 30–45%: Expansion
    toggle('overlay-2', p > 25 && p < 50);

    // 60–75%: Exploded
    toggle('overlay-3', p > 55 && p < 80);

    // 90–100%: CTA
    toggle('overlay-4', p > 85);
}

// Start
preloadImages();
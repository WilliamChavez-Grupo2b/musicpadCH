export class WaveBackground {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly bars = 48;
    private readonly color: string;
    private readonly reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    private cssWidth = 0;
    private cssHeight = 0;
    private level = 0;   // intensidad actual (0 a 1), se suaviza sola
    private target = 0;  // intensidad deseada: 1 sonando, 0 en pausa
    private time = 0;

    constructor(private readonly canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext("2d")!;
        this.color =
            getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#1db954";
        this.resize();
        window.addEventListener("resize", () => this.resize());
        requestAnimationFrame(this.draw);
    }

    setActive(active: boolean): void {
        this.target = active ? 1 : 0;
    }

    private resize(): void {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.cssWidth = rect.width;
        this.cssHeight = rect.height;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    private draw = (): void => {
        const { ctx, cssWidth: w, cssHeight: h, bars } = this;

        this.level += (this.target - this.level) * 0.06;
        if (!this.reduceMotion) this.time += 0.025;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.50;
        
        const slot = w / bars;
        const barWidth = slot * 0.6;

        for (let i = 0; i < bars; i++) {
            // Dos senos con fases distintas para que no se vea repetitivo
            const wave =
                (Math.sin(this.time * 1.6 + i * 0.35) + Math.sin(this.time * 0.9 + i * 0.8) + 2) / 4;
            // Las barras del centro son más altas, como una "montaña" detrás del video
            const envelope = 0.4 + 0.6 * Math.sin((Math.PI * i) / (bars - 1));
            const barHeight = h * (0.04 + wave * envelope * 0.9 * this.level);

            const x = i * slot + (slot - barWidth) / 2;
            const y = (h - barHeight) / 2;

            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
            ctx.fill();
        }

        requestAnimationFrame(this.draw);
    };
}
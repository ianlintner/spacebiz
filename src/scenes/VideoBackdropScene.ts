import * as Phaser from "phaser";

const VIDEO_URLS: ReadonlyArray<string> = [
  "video/video_01.mp4",
  "video/video_02.mp4",
  "video/video_03.mp4",
  "video/video_04.mp4",
];

const FADE_MS = 600;

/**
 * Persistent background scene that cycles through ambient videos.
 *
 * Sits beneath every other scene. Random initial pick, fade-to-black between
 * clips, never repeats back-to-back. Camera background stays transparent so
 * the game's base canvas color shows when the video texture is mid-swap.
 */
export class VideoBackdropScene extends Phaser.Scene {
  private video!: Phaser.GameObjects.Video;
  private index = Math.floor(Math.random() * VIDEO_URLS.length);

  constructor() {
    super({ key: "VideoBackdropScene" });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.video = this.add.video(W / 2, H / 2);
    this.video.setOrigin(0.5);
    this.video.setAlpha(0);

    this.video.on("created", () => this.fitCover());
    this.video.on("complete", () => this.advance());

    this.scale.on("resize", () => this.fitCover());

    this.loadCurrent();
  }

  private loadCurrent(): void {
    const url = VIDEO_URLS[this.index % VIDEO_URLS.length];
    this.video.loadURL([url], true /* noAudio */);
    this.video.play(false);
    this.tweens.add({
      targets: this.video,
      alpha: 1,
      duration: FADE_MS,
      ease: "Sine.easeOut",
    });
  }

  private fitCover(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.video.setPosition(W / 2, H / 2);
    const vw = this.video.width || W;
    const vh = this.video.height || H;
    const scale = Math.max(W / vw, H / vh);
    this.video.setDisplaySize(vw * scale, vh * scale);
  }

  private advance(): void {
    this.tweens.add({
      targets: this.video,
      alpha: 0,
      duration: FADE_MS,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.index = this.pickNextIndex();
        this.loadCurrent();
      },
    });
  }

  private pickNextIndex(): number {
    if (VIDEO_URLS.length <= 1) return 0;
    const offset = 1 + Math.floor(Math.random() * (VIDEO_URLS.length - 1));
    return (this.index + offset) % VIDEO_URLS.length;
  }
}


export abstract class Provider {
  // public iFrameTarget: HTMLElement | null;
  private host: string;

  constructor(host: string) {
    // this.iFrameTarget = iFrameTarget
    this.host = host;
    // this.iFrameTarget = document.querySelector(iFrameIdentifier);
    // this.playerTarget = document.querySelector(playerIdentifier);
    // this.videoTarget = document.querySelector(videoIdentifier);
    // this.controlsTarget = document.querySelector(controlsIdentifier);
  }

  public abstract contractView(): void;
  public abstract expandView(): void;
  public abstract enterFullScreen(): void;
  public abstract exitFullScreen(): void;
  public abstract adjustView(): void;
}
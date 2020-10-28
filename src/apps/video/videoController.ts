import getHost, { Hosts } from "@/helpers/domain/getHost";
import { AmazonController } from "@/providers/amazon/AmazonController";
import { Controller } from "@/providers/Controller";
import { DefaultController } from "@/providers/default/DefaultController";
import { DisneyPlusController } from "@/providers/disneyplus/DisneyPlusController";
import { NetflixController } from "@/providers/netflix/NetflixController";
import { VimeoController } from "@/providers/vimeo/VimeoController";
import { YouTubeController } from "@/providers/youtube/YouTubeController";

class VideoController {
  host: Hosts;
  videoController: Controller;

  constructor() {
    // Get host
    this.host = getHost(window.location.host);
    // Create VideoController
    switch (this.host) {
      case "amazon": {
        this.videoController = new AmazonController();
        break;
      }
      case "disneyplus": {
        this.videoController = new DisneyPlusController();
        break;
      }
      case "netflix": {
        this.videoController = new NetflixController();
        break;
      }
      case "vimeo": {
        this.videoController = new VimeoController();
        break;
      }
      case "youtube": {
        this.videoController = new YouTubeController();
        break;
      }
      default: {
        this.videoController = new DefaultController();
        break;
      }
    }
  }
}

new VideoController();

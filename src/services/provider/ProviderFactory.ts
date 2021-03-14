import { Default } from "./providers/default/Default";
import { YouTube } from "./providers/youtube/YouTube";
import { primeHosts as potentialPrimeHosts } from "@/helpers/domains/TLDs";
import { Provider } from "./Provider";
import { Vimeo } from "./providers/vimeo/Vimeo";
import { Netflix } from "./providers/netflix/Netflix";
import { DisneyPlus } from "./providers/disneyplus/DisneyPlus";
import { Amazon } from "./providers/amazon/Amazon";
import { FourAnime } from "./providers/4anime/FourAnime";

export class ProviderFactory {
  public host: string;
  public provider: Provider;

  constructor(host: string) {
    console.log("Jelly-Party: Provider -> constructor called");
    this.host = host;
    // Normalize all amazon country TLDs to www.amazon.com
    if (potentialPrimeHosts.includes(this.host)) {
      this.host = "www.amazon.com";
    }
    console.log(
      `Jelly-Party: ProviderFactory is creating provider for ${this.host}`,
    );

    // Configure provider
    switch (this.host) {
      case "www.netflix.com": {
        this.provider = new Netflix();
        break;
      }
      case "www.youtube.com": {
        this.provider = new YouTube();
        break;
      }
      case "www.disneyplus.com": {
        this.provider = new DisneyPlus();
        break;
      }
      case "www.amazon.com": {
        this.provider = new Amazon();
        break;
      }
      case "vimeo.com": {
        this.provider = new Vimeo();
        break;
      }
      case "4anime.to": {
        this.provider = new FourAnime();
        break;
      }
      default: {
        console.log("Jelly-Party: Using default provider.");
        this.provider = new Default();
      }
    }
  }
}

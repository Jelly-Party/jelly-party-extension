import { Amazon } from "./providers/Amazon"
import { Default } from "./providers/Default"
import { DisneyPlus } from "./providers/DisneyPlus"
import { Netflix } from "./providers/Netflix"
import { Vimeo } from "./providers/Vimeo"
import { YouTube } from "./providers/YouTube"
import { primeHosts as potentialPrimeHosts } from "@/helpers/TLDs"
import { Provider } from "./Provider"

export class ProviderHandler {
  public host: string
  public provider: Provider
  public iFrameTarget!: HTMLElement | null

  constructor(host: string) {
    console.log("Jelly-Party: Provider -> constructor called")

    // Set host
    this.host = host

    // Normalize all amazon country TLDs to www.amazon.com
    if (potentialPrimeHosts.includes(this.host)) {
      this.host = "www.amazon.com"
    }

    // Configure provider
    switch (host) {
      case "www.netflix.com":
        this.provider = new Netflix()
        break
      case "www.youtube.com": {
        this.provider = new YouTube()
        break
      }
      case "www.disneyplus.com": {
        this.provider = new DisneyPlus()
        break
      }
      case "www.amazon.com": {
        this.provider = new Amazon()
        break
      }
      case "vimeo.com": {
        this.provider = new Vimeo()
        break
      }
      default:
        this.provider = new Default()
    }
  }
}

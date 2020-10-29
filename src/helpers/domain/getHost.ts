import { primeHosts } from "./primeHosts";

export type Hosts =
  | "amazon"
  | "default"
  | "disneyplus"
  | "netflix"
  | "vimeo"
  | "youtube";

function flattenHost(host: string) {
  if (primeHosts.includes(host)) {
    return "www.amazon.com";
  } else {
    return host;
  }
}

export function getHost(host: string): Hosts {
  host = flattenHost(host);
  switch (host) {
    case "www.amazon.com": {
      return "amazon";
    }
    case "www.disneyplus.com": {
      return "disneyplus";
    }
    case "www.netflix.com": {
      return "netflix";
    }
    case "www.vimeo.com": {
      return "vimeo";
    }
    case "www.youtube.com": {
      return "youtube";
    }
    default: {
      return "default";
    }
  }
}

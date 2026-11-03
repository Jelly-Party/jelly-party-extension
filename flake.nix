{
  description = "Jelly Party development environment";

  # Keep the browser revisions aligned with Playwright in pnpm-lock.yaml. flake.lock pins the
  # exact nixpkgs revision so host and VM use the same browser binaries.
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          chromiumPlatform =
            if pkgs.stdenv.hostPlatform.isAarch64 then "chrome-linux-arm64" else "chrome-linux64";
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.geckodriver
              pkgs.playwright-driver.browsers
              pkgs.noto-fonts-color-emoji
            ] ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [
              pkgs.firefox
            ];

            # The store assets are screenshots of the real UI, which shows peer emoji, so the
            # capture browser needs an emoji font wherever `vp run assets:store` is run.
            FONTCONFIG_FILE = pkgs.makeFontsConf {
              fontDirectories = [ pkgs.noto-fonts-color-emoji pkgs.dejavu_fonts ];
            };

            PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = true;
            CHROME_PATH =
              if pkgs.stdenv.hostPlatform.isDarwin then
                # Development should open the user's real Chrome on macOS. The internal
                # Playwright directory differs between Intel and Apple Silicon releases.
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
              else
                "${pkgs.playwright-driver.browsers}/chromium-1248/${chromiumPlatform}/chrome";
            FIREFOX_BIN =
              if pkgs.stdenv.hostPlatform.isDarwin then
                "/Applications/Firefox.app/Contents/MacOS/firefox"
              else
                "${pkgs.firefox}/bin/firefox";
            GECKODRIVER_BIN = "${pkgs.geckodriver}/bin/geckodriver";
          };
        });
    };
}

var pb, player;
require(["playbackManager"], function (playbackManager) {
    pb = playbackManager;
    player = pb.getPlayers().filter(p => p.name == "Html Video Player")[0];
})

function playPause() {
    pb.playPause();
    chrome.runtime.sendMessage({ type: "playPause", tick: pb.getCurrentTicks(player) }, function (response) {
        console.log(response);
    });
}

function seek(tick) {
    pb.seek(tick, player);
    chrome.runtime.sendMessage({ type: "seek", tick: pb.getCurrentTicks(player) }, function (response) {
        console.log(response);
    });
}
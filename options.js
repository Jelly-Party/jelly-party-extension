

$(function () {
    // Enable tooltips
    $('[data-toggle="tooltip"]').tooltip()
    var name = $("#usernameTextfield")[0];
    // Handle button-save-options click
    $("#button-save-options").click(function (e) {
        var options = { name: (name.value) ? name.value : "guest" };
        chrome.storage.sync.set({ options: options }, function () {
            console.log('Options have been set:');
            console.log(options);
        })
        window.setTimeout(() => {
            $("#collapseExample").collapse("hide");
        }, 1000);
    });
    $("#button-go-back").click(function(e) {
        window.location.href = 'chrome-extension://ijgniglgnpneccdaknoekcefgnhffpci/popup.html';
    });
    function initOptions() {
        chrome.storage.sync.get(["options"], function (res) {
            console.log(res.options.name)
            name.value = res.options.name ? res.options.name : "guest";
        })
    }
    // Read options and set input fields
    initOptions();
})
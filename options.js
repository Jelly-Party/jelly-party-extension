

$(function () {
    // Enable tooltips
    $('[data-toggle="tooltip"]').tooltip()
    // Make variables available
    var s1 = $("#customSwitch1")[0];
    var s2 = $("#customSwitch2")[0];
    var name = $("#usernameTextfield")[0];
    // Handle button-save-options click
    $("#button-save-options").click(function (e) {
        var options = { name: (name.value) ? name.value : "guest", s1: s1.checked, s2: s2.checked };
        chrome.storage.sync.set({ options: options }, function () {
            console.log('Options have been set:');
            console.log(options);
        })
        window.setTimeout(() => {
            $("#collapseExample").collapse("hide");

        }, 1000)
    });
    function initOptions() {
        chrome.storage.sync.get(["options"], function (res) {
            s1.checked = res.options.s1;
            s2.checked = res.options.s2;
            name.value = (res.options.name) ? res.options.name : "guest";

        })
    }
    // Read options and set input fields
    initOptions();
})
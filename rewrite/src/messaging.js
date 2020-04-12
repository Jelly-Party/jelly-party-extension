
import store from "@/store.js"
import router from "@/router/index.js"

function startParty() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        console.log("Jelly-Party: Trying to start a new party.")
        chrome.tabs.sendMessage(tabs[0].id, { command: "startParty" }, function (response) {
            store.updateState({ isActive: true })
            getState()
        })
    })
}

function joinParty(id) {
    // Let's first validate the party id
    if (id.length < 8) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            console.log("Jelly-Party: Trying to join an existing party.")
            chrome.tabs.sendMessage(tabs[0].id, { command: "joinParty", data: { partyId: id } }, function (response) {
                // getState will update peers once they have joined
                getState()
            })
        })
    } else {
        console.log("Jelly-Party: Invalid Id..")
        this.leaveParty()
    }
}

function rejoinParty() {
    if (store.state.lastPartyId) {
        console.log(`Rejoing last party with Party-Id: ${store.state.lastPartyId}`)
        console.log(`store.state.lastPartyId is ${store.state.lastPartyId}`)
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            console.log("Jelly-Party: Trying to rejoin previous party.")
            chrome.tabs.sendMessage(tabs[0].id, { command: "joinParty", data: { partyId: store.state.lastPartyId } }, function (response) {
                getState()
            })
        })
    } else {
        // If there's no previous party, we'll just start a new one
        this.startParty()
    }
}

function leaveParty() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { command: "leaveParty" }, function (response) {
            getState()
        })
    })
}

function getState(navigate = false) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { command: "getState" }, function (response) {
            store.updateState(response.data)
            if (navigate) {
                // Route to Party Screen based on current state
                if (response.data.isActive) {
                    if (router.history.current.name !== 'Party') {
                        router.replace({ path: 'party' })
                    }
                }
            }
        })
    })
}

function setOptions(name) {
    var options = { name: (name.value) ? name.value : "guest" }
    chrome.storage.sync.set({ options: options }, function () {
        console.log('Options have been set:')
        console.log(options)
    })
}

function getOptions() {
    chrome.storage.sync.get(["options"], function (res) {
        store.state.name = res.options.name ? res.options.name : "guest"
    })
}


export { startParty, joinParty, rejoinParty, leaveParty, getState, getOptions, setOptions }
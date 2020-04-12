
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
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        console.log("Jelly-Party: Trying to join an existing party.")
        chrome.tabs.sendMessage(tabs[0].id, { command: "joinParty", data: { partyId: id } }, function (response) {
            // getState will update peers once they have joined
            getState()
        })
    })
}

function rejoinParty() {
    console.log("I'm here")
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
            console.log("New state is")
            console.log(store.state)
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
    var options = { name: name ? name : "Somebody" }
    chrome.storage.sync.set({ options: options }, function () {
        console.log('Options have been set:')
        console.log(options)
    })
}

function getOptions() {
    chrome.storage.sync.get(["options"], function (res) {
        store.state.name = res.options.name ? res.options.name : "Somebody"
    })
}


export { startParty, joinParty, rejoinParty, leaveParty, getState, getOptions, setOptions }
import { browser } from "webextension-polyfill-ts";

// Redirect to page that has full access to browser APIs
// This page will in turn initiate the autojoin
const joinURL = new URL(browser.runtime.getURL("join.html"));
joinURL.search = window.location.search;
window.location.href = joinURL.toString();

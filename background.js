var version = "3.9.0";

// Context menu will be created during lifecycle events to avoid duplicate creation

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["clear_guild.js"]
  });
});

function compareVer(a, b) // https://stackoverflow.com/a/53387532/11037661
{
    //treat non-numerical characters as lower version
    //replacing them with a negative number based on charcode of each character
    function fix(s)
    {
        return "." + (s.toLowerCase().charCodeAt(0) - 2147483647) + ".";
    }
    a = ("" + a).replace(/[^0-9\.]/g, fix).split('.');
    b = ("" + b).replace(/[^0-9\.]/g, fix).split('.');
    var c = Math.max(a.length, b.length);
    for (var i = 0; i < c; i++)
    {
        //convert to integer the most efficient way
        a[i] = ~~a[i];
        b[i] = ~~b[i];
        if (a[i] > b[i])
            return 1;
        else if (a[i] < b[i])
            return -1;
    }
    return 0;
};

function checkUpdates(){
  fetch('https://raw.githubusercontent.com/Theblockbuster1/disboard-auto-bump/master/manifest.json', {mode: 'cors'})
  .then(function(response) {
    if (response.ok) return response.text()
    else throw response.status+' - '+response.statusText
  })
  .then(function(text) {
      if(compareVer(JSON.parse(text).version, version) == 1) {
        chrome.notifications.create('', {
          title: 'Update available!',
          message: 'Click here to update.',
          contextMessage: 'https://github.com/Theblockbuster1/disboard-auto-bump',
          iconUrl: '/images/disboard-auto-bump-logo.png',
          requireInteraction: true,
          type: 'basic'
        });
      }
  })
  .catch(function(error) {
    console.error('An error occured while checking for update: '+error);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['safetymode'], function(data) {
    if (data.safetymode == undefined) chrome.storage.sync.set({safetymode:true});
  });
  // Ensure an alarm exists for periodic update checks (every 6 hours)
  chrome.alarms.create('checkUpdates', { periodInMinutes: 360 });
  // Create context menu (stable id required for event pages/service workers)
  try {
    chrome.contextMenus.create({
      id: 'stop-autobump',
      title: 'Stop auto-bumping this tab',
      contexts: ['page'],
      documentUrlPatterns: [
        '*://disboard.org/*dashboard/servers',
        '*://disboard.org/*dashboard/servers/',
        '*://disboard.org/*dashboard/servers?*',
        '*://disboard.org/*dashboard/servers/?'
      ]
    });
  } catch (e) {
    // ignore duplicate id errors
  }
  checkUpdates();
});

// Also create (or ensure) the menu on browser startup
chrome.runtime.onStartup.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: 'stop-autobump',
      title: 'Stop auto-bumping this tab',
      contexts: ['page'],
      documentUrlPatterns: [
        '*://disboard.org/*dashboard/servers',
        '*://disboard.org/*dashboard/servers/',
        '*://disboard.org/*dashboard/servers?*',
        '*://disboard.org/*dashboard/servers/?'
      ]
    });
  } catch (e) {
    // ignore duplicate id errors
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === 'checkUpdates') {
    chrome.storage.sync.get(['updates'], function(data) {
      if (data.updates == true) checkUpdates();
    });
  }
});

chrome.notifications.onClicked.addListener(function(id) {
  chrome.tabs.create({url: "https://github.com/Theblockbuster1/disboard-auto-bump"});
  chrome.notifications.clear(id);
});

chrome.tabs.query({
  url: ["*://disboard.org/*dashboard/servers", "*://disboard.org/*dashboard/servers/", "*://disboard.org/*dashboard/servers?*", "*://disboard.org/*dashboard/servers/?"]
}, function(tabs) {
  tabs.forEach(tab => {
    chrome.tabs.update(tab.id,{autoDiscardable:false});
  });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (!tab || !tab.url) return;
  const patterns = [
    /:\/\/disboard\.org\/.*dashboard\/servers(\/|\?|$)/
  ];
  if (patterns.some((re) => re.test(tab.url))) {
    if (changeInfo.autoDiscardable === true) {
      chrome.tabs.update(tabId,{autoDiscardable:false});
    }
  }
});

chrome.runtime.onMessage.addListener(function(message, sender) {
  if(message.closeThis) chrome.tabs.remove(sender.tab.id);
});

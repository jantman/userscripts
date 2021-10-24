# ABANDONED - userscripts

[![Project Status: Abandoned – Initial development has started, but there has not yet been a stable, usable release; the project has been abandoned and the author(s) do not intend on continuing development.](https://www.repostatus.org/badges/latest/abandoned.svg)](https://www.repostatus.org/#abandoned)

Some of my UserScripts

## Note on Usage

These scripts are tested against [GreaseMonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) in Firefox, and [TamperMonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) in Chrome. Note that because of the apparent [walled garden](https://en.wikipedia.org/wiki/Closed_platform) mindset of Chrome (I guess in the false guise of "protecting users"), stock Chrome can't even install userscripts hosted on GitHub.

## [CopyMarkdownLink](https://raw.githubusercontent.com/jantman/userscripts/master/CopyMarkdownLink.user.js)

Copy page title and location as a markdown link context menu entry, removing annoying Jira square-bracketed title.

## [TrelloContextMenu](https://raw.githubusercontent.com/jantman/userscripts/master/TrelloContextMenu.user.js)

Add page to a Trello board via context menu, with special handling for Jira, GitHub, FogBugz, Redmine and RT issues, Gmail, and ReviewBoard code reviews.

Loads a list of all of your boards and lists, and provides a context menu to add the current page to one of them.

Also handles adding any selected text to the description.

## [gw2_mmorpg-life_map_helper](https://raw.githubusercontent.com/jantman/userscripts/master/gw2_mmorpg-life_map_helper.user.js)

I helper for the [Interactive Maps of Tyria](http://gw2.mmorpg-life.com/interactive-maps/) on [gw2.mmorpg-life.com](http://gw2.mmorpg-life.com/):

* Allows you to independently toggle on and off types of icons, instead of seeing either one icon type or all of them.
* Allows you to click an icon to hide it, to track completion.

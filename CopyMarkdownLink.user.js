// ==UserScript==
// @name        CopyMarkdownLink
// @namespace   com.jasonantman.greasemonkey.copymarkdownlink
// @author      Jason Antman <jason@jasonantman.com>
// @downloadURL https://raw.githubusercontent.com/jantman/userscripts/master/CopyMarkdownLink.user.js
// @updateURL   https://raw.githubusercontent.com/jantman/userscripts/master/CopyMarkdownLink.user.js
// @include     *
// @description Copy page title and location as a markdown link context menu entry, removing annoying Jira square-bracketed title.
// @version     1.0.0
// @grant       GM_setClipboard
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js
// @copyright   2015 Jason Antman.
// ==/UserScript==

// if we don't support contextMenu, just return now
if (!("contextMenu" in document.documentElement &&
      "HTMLMenuItemElement" in window)) return;

// setup initMenu event listener
var body = document.body;
body.addEventListener("contextmenu", initMenu, false);

// menu item content
var CopyMarkdownLink_menuitem = '<menuitem label="Copy Page Title as Markdown" id="userscript-copy-markdown-link-item"></menuitem>';

function initMenu(aEvent) {
  // Executed when user right click on web page body
  // aEvent.target is the element you right click on
  var existing_menu = body.getAttribute("contextmenu");
  if (! existing_menu) {
      // add a new menu with our item in it
      $(body).append('<menu id="userscript-context-menu" type="context">' + CopyMarkdownLink_menuitem + '</menu>');
      // set the click handler
      $("#userscript-copy-markdown-link-item").click(copyLink);
      // set the body contextmenu attribute to our new menu
      $(body).attr("contextmenu", "userscript-context-menu");
  } else if (! $("#userscript-copy-markdown-link-item").length) {
      merge_menus(existing_menu);
  }
}

function merge_menus(existing_menu) {
    // if the body 'contextmenu' attribute is already set,
    // try to merge them
    $("#" + existing_menu).append(CopyMarkdownLink_menuitem);
    $("#userscript-copy-markdown-link-item").click(copyLink);
}

function copyLink(aEvent) {
  // Executed when user click on menuitem
  // aEvent.target is the <menuitem> element
  var title = document.title;
  title = title.replace(/\(|\)|\[|\]/g, '');
  title = title.replace(/-[^-]+Jira/, '');
  title = title.trim();
  var md = "[" + title + "](" + content.document.location + ")";
  //alert(md);
  GM_setClipboard(md);
}

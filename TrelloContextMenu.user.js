// ==UserScript==
// @name        TrelloContextMenu
// @description Add page to a Trello board via context menu, with special handling for Jira, GitHub, FogBugz, Redmine and RT issues, Gmail, and ReviewBoard code reviews.
// @namespace   com.jasonantman.greasemonkey.trellocontextmenu
// @author      Jason Antman <jason@jasonantman.com>
// @copyright   2015 Jason Antman.
// @include     *
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_xmlhttpRequest
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js
// @require     https://raw.githubusercontent.com/alexei/sprintf.js/master/dist/sprintf.min.js
// @require     https://api.trello.com/1/client.js?key=d141cd6874d46ba92770697e7721a614
// @downloadURL https://github.com/jantman/userscripts/raw/master/TrelloContextMenu.user.js
// @updateURL   https://github.com/jantman/userscripts/raw/master/TrelloContextMenu.user.js
// @version     0.3.2
// ==/UserScript==

// NOTE: Right now this only works in Firefox, as Firefox is the only browser that currently
// supports the HTML5 contextmenu standard.
// For Chrome, see <https://code.google.com/p/chromium/issues/detail?id=87553>


var trello_api_key = 'd141cd6874d46ba92770697e7721a614';
var trello_api_baseUrl = 'https://api.trello.com/1';
var trello_user_token = store('trello_user_token');
var trello_cache = {};
var waiting_callbacks = {};
var board_ids = {};

// logging
var log_levels = { trace: 5, debug: 4, info: 3, warn: 2, err: 1, off: 0 };
var log_level = 2;

function trace(msg) {if (log_level >= log_levels.trace) console.log(sprintf('trace: %s', msg));}
function debug(msg) {if (log_level >= log_levels.debug) console.log(sprintf('debug: %s', msg));}
function info(msg) {if (log_level >= log_levels.info) console.log(sprintf('info: %s', msg));}
function warn(msg) {if (log_level >= log_levels.warn) console.log(sprintf('warn: %s', msg));}
function err(msg) {if (log_level >= log_levels.err) console.log(sprintf('err: %s', msg));}
// end logging

// if we don't support contextMenu, just return now
if (!('contextMenu' in document.documentElement &&
      'HTMLMenuItemElement' in window)) return;

// setup initMenu event listener
var body = document.body;
body.addEventListener('contextmenu', initMenu, false);

function add_to_menu(menu_id) {
    trace('enter add_to_menu');
    console.log('cache: %o', trello_cache);
    $('#' + menu_id).append('<menu label="Add to Trello" id="userscript-trello-add-menu"></menu>');
    var menu = $('#userscript-trello-add-menu');
    // add items here
    var lists = Object.keys(trello_cache).sort();
    for (var i = 0; i < lists.length; i++) {
        menu.append('<menuitem label="' + lists[i] + '" id="userscript-trello-contextmenu-' + trello_cache[lists[i]] + '"></menuitem>');
        $('#userscript-trello-contextmenu-' + trello_cache[lists[i]]).click(doTrelloAdd);
    }
    menu.append('<hr><menuitem label="(Refresh Lists)" id="userscript-trello-contextmenu-refresh"></menuitem>');
    $('#userscript-trello-contextmenu-refresh').click(refreshLists);
}

function initMenu(aEvent) {
    // Executed when user right click on web page body
    // aEvent.target is the element you right click on
    trace('enter initMenu');
    var foo = store('trello_cache');
    if (foo) {
        trello_cache = JSON.parse(foo);
    } else {
        trello_cache = {};
    }
    var existing_menu = body.getAttribute('contextmenu');
    if (! existing_menu) {
        // add a new menu
        $(body).append('<menu id="userscript-context-menu" type="context"></menu>');
        // add our submenu to it
        add_to_menu('userscript-context-menu');
        // set the body contextmenu attribute to our new menu
        $(body).attr('contextmenu', 'userscript-context-menu');
    } else if (! $('#userscript-trello-add-menu').length) {
        add_to_menu(existing_menu);
    }
}

function refreshLists() {
    // refresh the Trello boards and lists
    trello_cache = {};
    $('#userscript-trello-add-menu').remove();
    loadTrelloBoards();
}

function doTrelloAdd(aEvent) {
    // Executed when user click on menuitem
    // aEvent.target is the <menuitem> element
    trace('enter doTrelloAdd');
    var listid = aEvent.target.id.replace('userscript-trello-contextmenu-', '');
    debug('add to list: ' + listid);
    if (!trello_user_token) {
        debug('authorizing...');
        trelloAuthorize();
    } else {
        debug('using token: ' + trello_user_token);
    }
    card = makecard();
    console.log('card: %o', card);
    add_card(card, listid);
}

/*
 * Begin code taken in whole or part from:
 * <https://github.com/danlec/Trello-Bookmarklet/blob/ef74529d52a55e41fa457c7ffad4d2dd43cac0f5/trello_bookmarklet.js>
 */

function get_est_jira_time() {
    var jira_time = $('#tt_single_values_orig').text().trim();
    var hours = jira_time.match(/[+-]?\d+\.\d+/g);

    if (hours != null && hours.length > 0) {
        return ' (' + hours[0] + ')';
    } else {
        return '';
    }
}

function makecard() {
    var name;
    // Default description is the URL of the page we're looking at
    var desc = location.href;
    var due = '';

    if (window.goBug) {

      // We're looking at a FogBugz case
      name = goBug.ixBug + ': ' + goBug.sTitle;

    } else if ($('#issue_header_summary').length) {

      // We're looking at a JIRA case in an older JIRA installation
      name = $('#key-val').text() + ': ' + $('#issue_header_summary').text();

    } else if ($('#jira').length) {

      // We're looking at a 5.1+ JIRA case
      name = $('#key-val').text() + ': ' + $('#summary-val').text() + get_est_jira_time();

    } else if ($('#show_issue').length) {

        // We're looking at a GitHub issue
        var ghtemp = $('.js-current-repository').attr('href');
        name = ghtemp.replace(/^\//, '') + ' ' + $('#show_issue .gh-header-number').text() + ' ' + $('#show_issue .js-issue-title').text();

    } else if ($('#all_commit_comments').length) {

      // We're looking at a GitHub commit
      name = $('.js-current-repository').text().trim() + ': ' + $('.commit .commit-title').text().trim();

    } else if (jQuery('head meta[content=Redmine]').length) {

      // We're looking at a redmine issue
      name = $('#content h2:first').text().trim() + ': ' + $('#content h3:first').text().trim();

    } else if ($('#header h1').length) {

        // We're looking at a RequestTracker (RT) ticket
        name = $('#header h1').text().trim();

    } else if ($('h1 .hP').length) {

        // we're looking at an email in Gmail
        name = $('h1 .hP').text().trim();

    } else if ($('div .review-request').length) {
        var rb_re = /\/r\/(\d+)\//;
        var res = rb_re.exec(window.location.href);
        if (res) {
            name = 'cr' + res[1] + ': ' + $('#summary').text().trim();
        } else {
            name = $.trim(document.title);
        }
    } else if ($('div .where-fields').length) {
        // version1
        name = $.trim(document.title);
        var v1due = jQuery('div a[data-assettype=Timebox]');
        if (v1due.length) {
            v1due = v1due[0].text.trim();
            var date_s = v1due.substring(v1due.indexOf(' ') + 1).split('-');
            due = new Date(date_s[2] + '-' + date_s[0] + '-' + date_s[1]);
        }
    }

    else {
        // use page title as card title, taking trello as a "read-later" tool
        name = $.trim(document.title);
    }

    // Get any selected text
    var selection;

    if (window.getSelection) {
      selection = '' + window.getSelection();
    } else if (document.selection && document.selection.createRange) {
      selection = document.selection.createRange().text;
    }

    // If they've selected text, add it to the name/desc of the card
    if (selection) {
      if (!name) {
        name = selection;
      } else {
        desc += '\n\n' + selection;
      }
    }

    name = name || 'Unknown page';
    data = {name: name, desc: desc};
    if (due != '' ) {
        data.due = due;
    }
    return data;
}

function store(key, value) {
    if (arguments.length == 2) {
        return (GM_setValue(key, value));
    } else {
        return GM_getValue(key);
    }
}

function add_success_handler(response) {
    // Display a little notification in the upper-left corner with a link to the card
    // that was just created
    if (log_level >= log_levels.trace) { console.log('response: %o', response); }
    if (response.status == 401) {
        err("Got 401 response - need to re-authenticate");
        handle_invalid_token();
        return;
    } else if (response.status == 200) {
        cardinfo = JSON.parse(response.responseText);
        show_success_popup(cardinfo.url);
    } else {
        show_error_popup("Card creation got unknown status code: " + response.status.toString());
    }
}

function handle_invalid_token() {
    trace("enter handle_invalid_token()");
    GM_deleteValue('trello_user_token');
    // for some reason, probably the direct access as "localStorage" (without "unsafeWindow"),
    // calling Trello.deauthorize() here has no effect.
    unsafeWindow.localStorage.removeItem('trello_token');
    trello_user_token = '';
    alert("ERROR: invalid authorization token; attempting to re-authorize. You must retry the previous action to complete authorization.");
    trace("call trelloAuthorize()");
    trelloAuthorize();
}

function show_success_popup(card_url) {
    info("Success: " + card_url);
    var $cardLink = $('<a>')
        .attr({
            href: card_url,
            target: 'card'
        })
        .text('Created a Trello Card')
        .css({
            position: 'absolute',
            left: 0,
            top: 0,
            padding: '4px',
            border: '1px solid #000',
            background: '#fff',
            'z-index': 1e3
        })
        .appendTo('body');

    setTimeout(function() {
        $cardLink.fadeOut(3000);
    }, 5000);
}

function add_failure_handler(response) {
    // Display a little notification in the upper-left corner with a link to the card
    // that was just created
    if (log_level >= log_levels.trace) { console.log('response: %o', response); }
    show_error_popup('ERROR Creating Trello Card');
}

function show_error_popup(msg) {
    info("Failure: " + msg);
    var $cardLink = $('<span>')
        .text(msg)
        .css({
            position: 'absolute',
            left: 0,
            top: 0,
            padding: '4px',
            border: '1px solid #000',
            background: '#fff',
            'z-index': 1e3
        })
        .appendTo('body');

    setTimeout(function() {
        $cardLink.fadeOut(3000);
    }, 5000);
}

function add_card(card, listid) {
    // Create the card
    GM_xmlhttpRequest(
        trello_post('lists/' + listid + '/cards', card, add_success_handler, add_failure_handler)
    );
}

/*
 * Begin code taken in whole or part from:
 * <https://gist.github.com/aggieben/5811685/948df5f0a955b1b083186535378936ccda5ca6ea>
 */

function trelloAuthorize() {
  Trello.authorize({
    type: 'popup',
    name: GM_info.script.name,
    scope: { read: true, write: true },
    success: function() {
      if (Trello.token()) {
        trello_user_token = Trello.token();
        store('trello_user_token', trello_user_token);
        console.log('authenticated with token: ' + trello_user_token);
      }
    }
  });
}

function trello_get(path, success, onerror) {
    var url = null;
    if (/\?/.test(path)) {
        url = sprintf('%s/%s&key=%s&token=%s',
              trello_api_baseUrl, path, trello_api_key, trello_user_token);
    } else {
        url = sprintf('%s/%s?key=%s&token=%s',
              trello_api_baseUrl, path, trello_api_key, trello_user_token);
    }

    debug('requesting: ' + url);
    return {
        url: url,
        method: 'GET',
        headers: { "Accept": "application/json" },
        onload: success,
        onerror: onerror || function(response) { debug(response); }
    };
}

function trello_post(path, data, success, error) {
  var url = null;
  if (/\?/.test(path)) {
    url = sprintf('%s/%s&key=%s&token=%s',
     trello_api_baseUrl, path, trello_api_key, trello_user_token);
  } else {
    url = sprintf('%s/%s?key=%s&token=%s',
     trello_api_baseUrl, path, trello_api_key, trello_user_token);
  }

  debug(sprintf('posting %s with data:  %s', url, JSON.stringify(data)));
  return {
    url: url,
    method: 'POST',
    data: JSON.stringify(data),
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    onload: success,
    onerror: error || function(response) { debug(response); }
  };
}

// modified by jantman to just cache all boards and lists
function updateBoardOptions(boards) {
    trace('enter updateBoardOptions');
    for ( var i in boards ) {
        debug("board " + boards[i].id + " name: " + boards[i].name);
        waiting_callbacks[boards[i].id] = 1;
        board_ids[boards[i].id] = boards[i].name;
        GM_xmlhttpRequest(
            trello_get(
                sprintf('boards/%s/lists?filter=open', boards[i].id),
                function(response) {
                    updateListOptions(JSON.parse(response.responseText));
                }
            )
        );
    }
}

// modified by jantman
function updateListOptions(lists) {
    for ( var i in lists) {
        board_id = lists[i].idBoard;
        board_name = board_ids[board_id];
        if (waiting_callbacks.hasOwnProperty(board_id)) {
            delete waiting_callbacks[board_id];
        }
        trello_cache[board_name + ': ' + lists[i].name] = lists[i].id;
    }
}

// modified by jantman
function loadTrelloBoards() {
    trace('enter loadTrelloBoards');
    if (!trello_user_token) {
        debug('authorizing...');
        trelloAuthorize();
    } else {
        debug('using token: ' + trello_user_token);
    }
    waiting_callbacks['loadTrelloBoards'] = 1;
    console.log('callbacks waiting: %o', waiting_callbacks);
    GM_xmlhttpRequest(
        trello_get(
            'members/me/boards?filter=open',
            function(response) {
                trace('response function for loadTrelloBoards');
                delete waiting_callbacks['loadTrelloBoards'];
                if (response.status != 200) {
                    if (/invalid token/i.test(response.responseText) || /unauthorized/i.test(response.statusText)) {
                        err("got invalid token message in loadTrelloBoards()");
                        handle_invalid_token();
                        return;
                    }
                }
                var json = JSON.parse(response.responseText);
                updateBoardOptions(json);
            }
        )
    );
    waitForCallbacks();
}

function waitForCallbacks() {
    var waiting = 0;
    for (var prop in waiting_callbacks) {
        if (waiting_callbacks.hasOwnProperty(prop)) {
            waiting += 1;
        }
    }
    debug('waiting on ' + waiting + ' callbacks');
    if (waiting > 0) {
        // wait 50ms and try again
        setTimeout(waitForCallbacks, 50);
    }
    store('trello_cache', JSON.stringify(trello_cache));
}

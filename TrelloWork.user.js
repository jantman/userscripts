// ==UserScript==
// @name        TrelloWork
// @namespace   com.jasonantman.greasemonkey.trellowork
// @author      Jason Antman <jason@jasonantman.com>
// @include     *
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @description Add Jira or GitHub Issues to a Trello board.
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js
// @require     https://raw.githubusercontent.com/alexei/sprintf.js/master/dist/sprintf.min.js
// @require     https://api.trello.com/1/client.js?key=d141cd6874d46ba92770697e7721a614
// @version     0.0.1
// @copyright   2015 Jason Antman.
// ==/UserScript==

var trello_api_key = 'd141cd6874d46ba92770697e7721a614';
var trello_api_baseUrl = 'https://api.trello.com/1';
var trello_user_token = store('trello_user_token');
var trello_cache = {};
var waiting_callbacks = {};

// logging
var log_levels = { trace: 5, debug: 4, info: 3, warn: 2, err: 1, off: 0 };
var log_level = 6;

function trace(msg) {if (log_level > log_levels.trace) console.log(sprintf('trace: %s', msg));}
function debug(msg) {if (log_level > log_levels.debug) console.log(sprintf('debug: %s', msg));}
function info(msg) {if (log_level > log_levels.info) console.log(sprintf('info: %s', msg));}
function warn(msg) {if (log_level > log_levels.warn) console.log(sprintf('warn: %s', msg));}
function err(msg) {if (log_level > log_levels.err) console.log(sprintf('err: %s', msg));}
// end logging

// if we don't support contextMenu, just return now
if (!('contextMenu' in document.documentElement &&
      'HTMLMenuItemElement' in window)) return;

// setup initMenu event listener
var body = document.body;
body.addEventListener('contextmenu', initMenu, false);

function menuContent() {
    trace('enter menuContent');
    if (!trello_user_token) {
        debug('authorizing...');
        trelloAuthorize();
    } else {
        debug('using token: ' + trello_user_token);
    }
    menuhtml = '<menu label="Add to Trello" id="userscript-trello-add-menu">';
    //menuhtml += '<menuitem label="Add to Trello: Work" id="userscript-trello-work-add"></menuitem>';
    menuhtml += '<hr><menuitem label="Refresh Lists" id="userscript-trello-contextmenu-refresh"></menuitem>';
    menuhtml += '</menu>';
    return menuhtml;
}

function initMenu(aEvent) {
    // Executed when user right click on web page body
    // aEvent.target is the element you right click on
    trace('enter initMenu');
    var existing_menu = body.getAttribute('contextmenu');
    if (! existing_menu) {
        // add a new menu with our item in it
        $(body).append('<menu id="userscript-context-menu" type="context">' + menuContent() + '</menu>');
        // set the click handler
        $('#userscript-trello-work-add').click(doTrelloAdd);
        // set the body contextmenu attribute to our new menu
        $(body).attr('contextmenu', 'userscript-context-menu');
    } else if (! $('#userscript-trello-work-add').length) {
        merge_menus(existing_menu);
    }
}

function merge_menus(existing_menu) {
    // if the body 'contextmenu' attribute is already set,
    // just append our menu item to it
    $('#' + existing_menu).append(menuContent());
    $('#userscript-trello-work-add').click(doTrelloAdd);
}

function doTrelloAdd(aEvent) {
    // Executed when user click on menuitem
    // aEvent.target is the <menuitem> element
    trace('enter doTrelloAdd');
    if (!trello_user_token) {
        debug('authorizing...');
        trelloAuthorize();
    } else {
        debug('using token: ' + trello_user_token);
    }
    card = makecard();
    console.log(card);
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
      name = $('#show_issue .number strong').text() + ' ' + $('#show_issue .discussion-topic-title').text();

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
    return {name: name, desc: desc};
}

function store(key, value) {
    if (arguments.length == 2) {
        return (GM_setValue(key, value));
    } else {
        return GM_getValue(key);
    }
}

function add_card(card) {
    // Create the card
    if (name) {
        Trello.post('lists/' + trelloIdList + '/cards', card,
                    function(card) {
                        // Display a little notification in the upper-left corner with a link to the card
                        // that was just created
                        var $cardLink = $('<a>')
                            .attr({
                                href: card.url,
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
                    });
    }
}

/*
 * Begin code taken in whole or part from:
 * <https://gist.github.com/aggieben/5811685/948df5f0a955b1b083186535378936ccda5ca6ea>
 */

/*
    info("create the card for post " + $parent.attr(idattr));
    var cardTitle = $('#question-header a').text();
    var cardText = sprintf('[Meta Post](https://%s/q/%s)\n\n---\n\n%s', 
                            window.location.host,
                            $parent.attr(idattr),
                            $parent.find('div.post-text').html());
    createTrelloCard({
      name: cardTitle,
      desc: toMarkdown(cardText.trim()),
      listId: $('select.list').val(),
      labels: [$('select.labels').val()],
      success: function(data) {
        $div.fadeOut('fast', function() {
          $(this).trigger('removing').remove();
        });
      }
    });
  });
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
        GM_xmlhttpRequest(
	    trello_get(
	        sprintf('boards/%s/lists?filter=open', boards[i].id),
	        function(response) {
		    updateListOptions(JSON.parse(response.responseText), boards[i].id, boards[i].name);
	        }
	    )
        );
    }
}

// modified by jantman
function updateListOptions(lists, board_id, board_name) {
    delete waiting_callbacks[board_id];
    trace('enter updateListOptions, board_name=' + board_name);
    for ( var i in lists) {
        debug('list id=' + lists[i].id + ' name=' + lists[i].name);
    }
}

// modified by jantman
function loadTrelloBoards() {
    trace('enter loadTrelloBoards');
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
                        warn('invalid token');
                        $('div.trellopopup p.messages').html('An error has occurred.  Please try again');
                        trello_user_token = null;
                        store('trello_user_token', null);
                        Trello.deauthorize();
                        trelloAuthorize();
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

function createTrelloCard(options) {
  GM_xmlhttpRequest(
    trello_post(
      'cards',
      { name: options.name, idList: options.listId, labels: options.labels, due: null, desc: options.desc },
      options.success));
}

function waitForCallbacks() {
    var waiting = 0;
    for (var prop in waiting_callbacks) {
        if (waiting_callbacks.hasOwnProperty(prop)) {
            waiting += 1;
        }
    }
    debug('waiting on ' + waiting + ' callbacks');
    if (waiting == 0) {
        return;
    }
    console.log('callbacks waiting: %o', waiting_callbacks);
    // wait 50ms and try again
    setTimeout(waitForCallbacks, 50);
}

// ==UserScript==
// @name        gw2_mmorpg-life_map_helper
// @namespace   com.jasonantman.greasemonkey
// @description Helper for showing and hiding icons on maps on gw2.mmorpg-life.com
// @author      Jason Antman <jason@jasonantman.com>
// @copyright   2016 Jason Antman.
// @include     http://gw2.mmorpg-life.com/*map*/*/
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js
// @grant       none
// @downloadURL https://github.com/jantman/userscripts/raw/master/gw2_mmorpg-life_map_helper.user.js
// @updateURL   https://github.com/jantman/userscripts/raw/master/gw2_mmorpg-life_map_helper.user.js
// @version     3
// ==/UserScript==

var jantman_state = [1, 1, 1, 1, 1, 1];
var jantman_undo = [];

console.log("begin jantman onready");
var jantman_div_content = [
  '<div id="jantman_map_helper" style="background-color: #9494b8;">',
  '<strong>Map Helper Userscript</strong>',
  '<p>Toggle: ',
  '<a id="jantman_click_hearts">Hearts</a>',
  '<a id="jantman_click_hero_points">Hero Points</a>',
  '<a id="jantman_click_POIs">POIs</a>',
  '<a id="jantman_click_waypoints">Waypoints</a>',
  '<a id="jantman_click_vistas">Vistas</a>',
  '<a id="jantman_click_events">Events</a>',
  '</p>',
  '<p>Use the toggle links above to toggle on/off (shown/hidden) types of icons.</p>',
  '<p>Click on an icon to hide it, i.e. for tracking completion. Right-click to visit the link for the icon.</p>',
  '<p>To get clicked icons back: <a id="jantman_click_undo">Undo</a></p>',
  '<p>To restore the site\'s normal functionality, disable this script.</p>',
  '</div>'
].join('\n');
$('.map_with_pois').prepend(jantman_div_content);
$('#jantman_click_hearts').click(function() { jantman_toggle_type(0); });
$('#jantman_click_hero_points').click(function() { jantman_toggle_type(1); });
$('#jantman_click_POIs').click(function() { jantman_toggle_type(2); });
$('#jantman_click_waypoints').click(function() { jantman_toggle_type(3); });
$('#jantman_click_vistas').click(function() { jantman_toggle_type(4); });
$('#jantman_click_events').click(function() { jantman_toggle_type(5); });
$('#jantman_click_undo').click(function() {
  item = jantman_undo.pop();
  item.show();
});

// code to hide each individual thing
$('.add_el').each(function(index) {
  // when the div is clicked, toggle its visibility
  $(this).click(function() {
    if ($(this).is(":visible")) {
      $(this).hide();
      jantman_undo.push(this);
    } else {
      $(this).show();
    }
  });
  var parent = $(this);
  // prevent clicks from being handled by children (links)
  // loop over the links in each div
  $(this).find('a').each(function(index) {
    // override the click function for each
    $(this).click(function(e) {
      console.log("click stopped.");
      // prevent the default action from happening
      e.preventDefault();
      e.stopPropagation();
      // instead toggle the parent
      if (parent.is(":visible")) {
        parent.hide();
        jantman_undo.push(parent);
      } else {
        parent.show();
      }
    });
  });
});
// end hide each
$('#filtercontainer').hide();
// finally, hide the original controls


console.log("end jantman onready");

// toggle icons of a specific type on and off
function jantman_toggle_type(evt_type) {
  console.log("toggling type: " + evt_type);
  if (evt_type == 5) {
    // this is an "Event", which has a class of just '.add_el' with no X_type
    if (jantman_state[evt_type] == 1) {
      console.log("event type " + evt_type + "current state is 1 (shown)");
      // if our state is shown, update state to hidden and hide
      jantman_state[evt_type] = 0;
      $('.add_el').each(function(index) {
        if ($(this).attr('class') == 'add_el') {
          $(this).hide();
        }
      });
    } else {
      console.log("event type " + evt_type + " current state is 0 (hidden)");
      // if our state is hidden, update state to shown and show
      jantman_state[evt_type] = 1;
      $('.add_el').each(function(index) {
        if ($(this).attr('class') == 'add_el') {
          $(this).show();
        }
      });
    }
  } else {
    // this is something other than an Event, which has an X_type class
    if (jantman_state[evt_type] == 1) {
      console.log("event type " + evt_type + "current state is 1 (shown)");
      // if our state is shown, update state to hidden and hide
      jantman_state[evt_type] = 0;
      $('.' + evt_type + '_type').each(function(index) {
        $(this).hide();
      });
    } else {
      console.log("event type " + evt_type + " current state is 0 (hidden)");
      // if our state is hidden, update state to shown and show
      jantman_state[evt_type] = 1;
      $('.' + evt_type + '_type').each(function(index) {
        $(this).show();
      });
    }
  }
}

// ==UserScript==
// @name     Github Expore+
// @version  1
// @include  https://github.com/*
// @grant    GM.notification
// @grant    GM.setValue
// @grant    GM.getValue
// ==/UserScript==

const ENDPOINT = "http://localhost:8000";
var SESSION_ID;
var TOPICS;

function create_session_id() {
    return new Promise ((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url=ENDPOINT+'/session/new';
      xhr.open("GET", url);
      xhr.responseType = 'json';
      xhr.send();

      xhr.onreadystatechange = (e) => {
        resolve(xhr.response['id']);
      }
  });
}

function navigate_to_random_github_repo() {
  const xhr = new XMLHttpRequest();
  const url=ENDPOINT+'/session/' + SESSION_ID + '/random';
  xhr.open("GET", url);
  xhr.responseType = 'json';
  xhr.send();

  xhr.onreadystatechange = (e) => {
    console.log("Navigating to", xhr.response['url']);
    window.location.assign(xhr.response['url']);
  }
}

function refresh_session() {
  return new Promise ((resolve, reject) => {
    (async () => {
        SESSION_ID = await create_session_id();
        await GM.setValue("session-id", SESSION_ID);
        resolve(SESSION_ID);
    })();
  });
}

function get_topics(cb) {
  const xhr = new XMLHttpRequest();
  const url=ENDPOINT+'/session/' + SESSION_ID + '/topics';
  xhr.open("GET", url);
  xhr.responseType = 'json';
  xhr.send();
  xhr.onreadystatechange = (e) => {
    TOPICS=xhr.response;
    cb(TOPICS);
  }
}

function display_topics_as_notification() {
  get_topics(function(topics) {
    GM.notification({
      text: "Available Topics: " + topics.toString(),
      title: "Github Explore+",
      ondone: function() {
        console.log("notified topics.", xhr.response);
      }
    });
  });
}

function build_topics_list(topics, topics_list) {
  topics.forEach(topic => {
    l = document.createElement("a");
    l.innerHTML = topic;
    l.addEventListener("click", function(e) {
      const xhr = new XMLHttpRequest();
      const url=ENDPOINT+'/session/' + SESSION_ID + '/random/' + topic;
      xhr.open("GET", url);
      xhr.responseType = 'json';
      xhr.send();

      xhr.onreadystatechange = (e) => {
        console.log("Navigating to", xhr.response['url']);
        window.location.assign(xhr.response['url']);
      }
    });
    l.className = "rghv-button";
    li = document.createElement("li");
    delete_l = document.createElement("span");
    delete_l.addEventListener("click", function(e) {
      const xhr = new XMLHttpRequest();
      const url=ENDPOINT+'/session/' + SESSION_ID + '/topic/delete/' + topic;
      xhr.open("GET", url);
      xhr.responseType = 'json';
      xhr.send();
      xhr.onreadystatechange = (e) => {
        rerender_topics_list();
      }
    });
    delete_l.style.color = "red";
    delete_l.innerHTML = "&times;";
    delete_l.id = "delete";
    delete_l.className = "rghv-button";
    li.appendChild(l);
    li.appendChild(delete_l);
    topics_list.appendChild(li);
  });
  return topics_list;
}

function style_sheet() {
  var style = document.createElement('style');
  style.innerHTML = `
    /* The Modal (background) */
    .rghv-modal {
      display: none; /* Hidden by default */
      position: fixed; /* Stay in place */
      z-index: 1; /* Sit on top */
      padding-top: 100px; /* Location of the box */
      left: 0;
      top: 0;
      width: 100%; /* Full width */
      height: 100%; /* Full height */
      overflow: auto; /* Enable scroll if needed */
      background-color: rgb(0,0,0); /* Fallback color */
      background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
    }

    /* Modal Content */
    .rghv-modal-content {
      position: relative;
      background-color: #fefefe;
      margin: auto;
      padding: 0;
      border: 1px solid #888;
      width: 80%;
      box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0,0.19);
      -webkit-animation-name: animatetop;
      -webkit-animation-duration: 0.4s;
      animation-name: animatetop;
      animation-duration: 0.4s
    }

    /* Add Animation */
    @-webkit-keyframes animatetop {
      from {top:-300px; opacity:0}
      to {top:0; opacity:1}
    }

    @keyframes animatetop {
      from {top:-300px; opacity:0}
      to {top:0; opacity:1}
    }

    /* The rghv-close Button */
    .rghv-close {
      color: white;
      float: right;
      font-size: 28px;
      font-weight: bold;
    }

    .rghv-close:hover,
    .rghv-close:focus {
      color: #000;
      text-decoration: none;
      cursor: pointer;
    }

    .rghv-button {
      font-weight: bold;
      padding-left: 1px;
      padding-right: 1px;
    }

    .rghv-button:hover,
    .rghv-button:focus {
      cursor: pointer;
    }

    .rghv-modal-header {
      padding: 2px 16px;
      background-color: #5cb85c;
      color: white;
    }

    .rghv-modal-body {padding: 2px 16px;}

    .rghv-modal-footer {
      padding: 2px 16px;
      background-color: #5cb85c;
      color: white;
    }

    .rghv-topics-list {
      list-style-type: none;
    }

    .rghv-insite-menu {
      background-color: #5cb85c;
      color: white;
      padding: 3px 3px;
      position: fixed;
      left: 0px;
      top: 90%;
  		opacity: .5;
    }

    .rghv-attribution {
      float: right;
      font-size: 0.7em;
    }
  `;
  return style;
}

function rghv_modal_header() {
  var modal_header = document.createElement("div");
  modal_header.className = "rghv-modal-header";
  var close = document.createElement("span");
  close.addEventListener("click", function(e) {
    modal = document.querySelector('.rghv-modal');
    modal.parentNode.removeChild(modal);
  });
  close.className = "rghv-close";
  close.innerHTML = "&times;";
  var mh_header = document.createElement("h2");
  mh_header.innerHTML = "Github Explore+";
  modal_header.appendChild(close);
  modal_header.appendChild(mh_header);
  return modal_header;
}

function rerender_topics_list() {
  get_topics(function(topics) {
    topics_list = document.querySelector('.rghv-topics-list');
    topics_list.innerHTML = "";
    topics_list = build_topics_list(topics, topics_list);
  });
}

function submit_new_topic() {
  const xhr = new XMLHttpRequest();
  if (!document.querySelector('#rnv_get_topic').value) {return}
  const url=ENDPOINT+'/session/' + SESSION_ID + '/topic/new/' + document.querySelector('#rnv_get_topic').value;
  xhr.open("GET", url);
  xhr.responseType = 'json';
  xhr.send();

  // re-render topics list
  rerender_topics_list();
  document.querySelector('#rnv_get_topic').value = "";
}

function rghv_modal_body(topics) {
  var modal_body = document.createElement("rghv-modal-body");
  var input_label = document.createElement("p");
  input_label.innerHTML = "Enter a new topic (enter to save)";
  topics_list = document.createElement('ul');
  topics_list.className = "rghv-topics-list";
  topics_list = build_topics_list(topics, topics_list);
  topic_list_label = document.createElement("h2");
  topic_list_label.innerHTML = "Existing topics";
  var input = document.createElement("input");
  input.id = "rnv_get_topic";
  input.addEventListener("keyup", function(e) {
      if(e.key === "Enter") {
        submit_new_topic()
      }
  });
  var new_session = document.createElement("button");
  new_session.innerHTML = "clear all";
  new_session.addEventListener("click", function(e) {
    (async () => {
      await refresh_session();
      rerender_topics_list();
    })();
  });
  var save_input = document.createElement("button");
  save_input.addEventListener("click", function(e) {
    submit_new_topic()
  });
  save_input.innerHTML = "save";
  new_session.addEventListener("click", function(e) {
    (async () => {
      await refresh_session();
      rerender_topics_list();
    })();
  });

  modal_body.appendChild(topic_list_label);
  modal_body.appendChild(topics_list);
  modal_body.appendChild(input_label);
  modal_body.appendChild(input);
  modal_body.appendChild(save_input);
  modal_body.appendChild(new_session);
  return modal_body;
}



function el(tag, inner_html, class_name) {
  e = document.createElement(tag);
  e.innerHTML = inner_html;
  if(class_name) {
    e.className = class_name;
   }
  return e;
}

function rghv_button(label, click_cb) {
  b = el('span', label, 'rghv-button');
  b.addEventListener("click", function(e) {
    click_cb();
  });
  return b;
}

function next_article_control(label) {
  return rghv_button(label, function(e) { navigate_to_random_github_repo(); });
}

function rghv_modal_footer() {
  var modal_footer = document.createElement('div');
  modal_footer.className = 'rghv-modal-footer';
  var github_link = el('a', 'Project Source');
  github_link.href = 'https://github.com/joeystevens00/Github-Explore-Plus';
  var attribution = el("span", "", "rghv-attribution");
  attribution.appendChild(github_link);
  controls_tip = document.createElement("span");
  control_next_article = document.createElement("span");
  controls_tip.innerHTML = "Use Keyboard Arrows to Navigate";
  controls_tip.appendChild(next_article_control("(←Next Repo)"));
  controls_tip.appendChild(rghv_button("(↓See Topics)", function(e) { display_topics_as_notification(); }));
  controls_tip.appendChild(rghv_button("(↑Access Menu)", function(e) { display_menu(); })); // clicking should appear to do nothing
  controls_tip.appendChild(next_article_control("(Next Repo→)"));
  modal_footer.appendChild(controls_tip);
  modal_footer.appendChild(attribution);
  return modal_footer;
}

function rghv_modal_content(topics) {
  var modal_content = document.createElement("div");
  modal_content.className = "rghv-modal-content";
  modal_content.appendChild(rghv_modal_header());
  modal_content.appendChild(rghv_modal_body(topics));
  modal_content.appendChild(rghv_modal_footer());
  return modal_content;
}

async function display_menu() {
  TOPICS = await load_topics_for_valid_session();
  // avoid opening multiple times
  if (document.querySelector('.rghv-modal') && document.querySelector('.rghv-modal').style.display === "block") {return}
  style = style_sheet();
  document.head.appendChild(style);
  var modal = document.createElement("div");
  modal.className = "rghv-modal";
  modal.appendChild(rghv_modal_content(TOPICS));
  document.body.appendChild(modal);
  modal.style.display="block";

  // When the user clicks anywhere outside of the modal, rghv-close it
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.parentNode.removeChild(modal);
    }
  }
}

document.onkeydown = checkKey;

function checkKey(e) {
    (async () => {
        SESSION_ID = await GM.getValue("session-id");
    })();
    e = e || window.event;
    if (e.keyCode == '38') {
      // up arrow
      display_menu();
    }
    else if (e.keyCode == '40') {
      display_topics_as_notification();
        // down arrow
    }
    else if (e.keyCode == '37') {
      navigate_to_random_github_repo();
       // left arrow
    }
    else if (e.keyCode == '39') {
       // right arrow
      navigate_to_random_github_repo();
    }

}

function load_topics_for_valid_session() {
  // Validate session
  return new Promise ((resolve, reject) => {
    (async () => {
      const xhr = new XMLHttpRequest();
      const url=ENDPOINT+'/session/' + SESSION_ID;
      xhr.open("GET", url);
      xhr.responseType = 'json';
      xhr.onreadystatechange = (e) => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if(xhr.status === 200) {
            console.log("Session valid", xhr.response);
            if(xhr.response.topics) {
              resolve(xhr.response.topics);
            }
            else {
              reject();
            }
          }
          else {
            (async() => {
              await refresh_session();
              reject();
            })();
          }
        }
      }
      xhr.send();
    })();
  });
}

function insite_menu_control() {
  menu = document.createElement('div');
  menu.className = "rghv-insite-menu";
  menu.innerHTML = "Explore+";
  menu.addEventListener("click", function(e) {
    display_menu();
  });
  document.head.appendChild(style_sheet());
  document.body.appendChild(menu);
}

insite_menu_control();

// Load/Set session
(async () => {
  if(!await GM.getValue("session-id", 0)) {
    await refresh_session();
  }
  SESSION_ID = await GM.getValue("session-id");
})();


// First time user controls notification
(async () => {
  if(!await GM.getValue("displayed-controls-notification", 0)) {
    await GM.setValue("displayed-controls-notification", 1);
    GM.notification({
      text: "(←Next)(↓Topics)(↑Menu)(Next→)",
      title: "Github Explore+",
      ondone: function() {
        console.log("notified controls.");
      }
    });
  }
})();

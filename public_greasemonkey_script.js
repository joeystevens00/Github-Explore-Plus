// ==UserScript==
// @name     Github Expore+
// @version  1
// @include  https://github.com/*
// @grant    GM.notification
// @grant    GM.setValue
// @grant    GM.getValue
// ==/UserScript==

const ENDPOINT = "https://github-explorer.mormo.dev/";
var SESSION_ID;
var TOPICS;

function insert_css(css) {
  const ele= document.createElement('style');
  ele.type = 'text/css';
  ele.innerHTML = css;
  document.head.appendChild(ele);
}

function get_url(url) {
  return new Promise ((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.send();

    xhr.onreadystatechange = (e) => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        resolve(xhr.response);
      }
    }
  });
}

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

function navigate_to(url) {
  console.log("Navigating to", url);
  window.location.assign(url);
}

function navigate_to_random_github_repo() {
  (async () => { await GM.setValue("page-history-depth", 0); })();

  const xhr = new XMLHttpRequest();
  const url=ENDPOINT+'/session/' + SESSION_ID + '/random';
  xhr.open("GET", url);
  xhr.responseType = 'json';
  xhr.send();

  xhr.onreadystatechange = (e) => {
    navigate_to(xhr.response['url']);
    (async () => {
      var page_history = await GM.getValue("page-history", []);
      page_history.push(xhr.response['url']);
      page_value_max = parseInt(await GM.getValue("page-history-max", 2));
      console.log('page_value_max', page_value_max);
      while(page_history.length >= page_value_max+1) {
          console.log('Purging page_history: ', page_history.shift());
      }
      await GM.setValue("page-history", page_history);
      console.log('page_history', await GM.getValue("page-history"));
    })();
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
    //chip
    l = createElementFromHTML(`<li>
      <span class="rgv-chip rgv-c-hand">
        <span>` + topic + `</span>
        <a href="#" class="rgv-btn rgv-btn-clear" aria-label="Close" role="button"></a>
      </span>
    </li>`);
    delete_l = l.children[0].children[1];
    topic_l = l.children[0].children[0];
    // without chip
    // l = createElementFromHTML(`<li class="menu-item"></li>`);
    //a = el('a', topic);
    //a.appendChild(createElementFromHTML(`<i class="icon icon-link"></i>`));
    // a.addEventListener("click", ...)
    topic_l.addEventListener("click", function(e) {
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

    //delete_l = document.createElement("span");
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
    // delete_l.style.color = "red";
    // delete_l.innerHTML = "&times;";
    // delete_l.id = "delete";
    // delete_l.className = "rghv-button";
    //l.appendChild(a);
    //l.appendChild(delete_l);
    topics_list.appendChild(l);
  });
  console.log(topics_list);
  return topics_list;
}

function style_sheet() {
  var style = document.createElement('style');
  style.innerHTML = `
    .rghv-topics-list, .rghv-history-list {
      list-style-type: none;
      display: flex;
      flex-wrap: wrap;
    }

    .rghv-insite-menu {
      color: white;
      padding: 3px 3px;
      position: fixed;
      left: 0px;
      top: 50%;
      width: 1%;
  		opacity: .5;
      display: flex;
      flex-wrap: wrap;
    }

    .rghv-insite-menu > button {
      margin: 1px;
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
  var modal_header = createElementFromHTML(`
      <div class="rgv-modal-header">
        <div class="rgv-modal-title h5">Github Explore+</div>
      </div>
  `)
  var close = createElementFromHTML(`<a class="rgv-btn rgv-btn-clear rgv-float-right rghv-close" aria-label="Close"></a>`);
  close.addEventListener("click", function(e) {
    modal = document.querySelector('#rghv-modal');
    modal.parentNode.removeChild(modal);
  });
  modal_header.appendChild(close);
  return modal_header;
}

function rerender_topics_list() {
  get_topics(function(topics) {
    new_list = new_topics_list();
    new_list = build_topics_list(topics, new_list);
    topics_list = document.querySelector('.rghv-topics-list');
    topics_list.parentNode.replaceChild(new_list, topics_list);
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

function new_topics_list() {
  return createElementFromHTML(`
    <ul class="rgv-menu rghv-topics-list">
      <li class="divider" data-content="TOPICS"></li>
    </ul>
  `);
}

function rghv_modal_body(topics) {
  var modal_body = createElementFromHTML(`<div class="rgv-modal-body rghv-modal-body"></div>`)
  var modal_content = createElementFromHTML(`
    <div class="rgv-content">
      <h2>Existing topics</h2>
    </div>
  `);
  topics_list = new_topics_list();
  topics_list = build_topics_list(topics, topics_list);
  var input = createElementFromHTML(`
    <div class="rgv-form-group">
      <label class="rgv-form-label" for="rnv_get_topic">Enter a new topic (press enter to save)</label>
      <input class="rgv-form-input" type="text" id="rnv_get_topic" placeholder="Topic">
    </div>
  `);
  input.addEventListener("keyup", function(e) {
      if(e.key === "Enter") {
        submit_new_topic()
      }
  });
  var new_session = createElementFromHTML(`
    <button class="rgv-btn rgv-btn-primary rgv-btn-sm"><i class="rgv-icon rgv-icon-arrow-left"></i>clear all</button>
  `);
  new_session.addEventListener("click", function(e) {
    (async () => {
      await refresh_session();
      rerender_topics_list();
    })();
  });
  var save_input = createElementFromHTML(`
    <button class="rgv-btn rgv-btn-primary rgv-btn-sm"><i class="rgv-icon rgv-icon-arrow-left"></i>save</button>
  `);
  save_input.addEventListener("click", function(e) {
    submit_new_topic()
  });
  var allow_repeats = createElementFromHTML(`
      <label class="rgv-form-switch">
        <input type="checkbox" class="rghv-allow-repeats">
        <i class="rgv-form-icon"></i>repeat?
      </label>
  `);
  (async () => {
    allow_repeats.children[0].checked = await GM.getValue("allow_repeats", true);
    console.log('setting allow_repeats', allow_repeats.children[0].checked);

  })();
  allow_repeats.addEventListener('click', function() {
      (async () => {
        allow_repeats_value = document.querySelector('.rghv-allow-repeats').checked;
        await GM.setValue("allow_repeats", allow_repeats_value);
        const xhr = new XMLHttpRequest();
        const url=ENDPOINT+'/session/' + SESSION_ID;
        xhr.open("PUT", url);
        xhr.responseType = 'json';
        xhr.send(JSON.stringify({'no_repeats': !allow_repeats_value}));
        console.log('setting allow_repeats', allow_repeats_value);
      })();
  });
  modal_content.appendChild(topics_list);
  modal_content.appendChild(input);
  modal_content.appendChild(save_input);
  modal_content.appendChild(new_session);
  modal_content.appendChild(allow_repeats);
  modal_body.appendChild(modal_content);
  return modal_body;
}

function navigate_to_last_page() {
  (async () => {
    var page_history = await GM.getValue("page-history");
    console.log(page_history);
    var current_page_history_depth = await GM.getValue("page-history-depth", 0);
    console.log('page_history_depth', current_page_history_depth);
    navigate_to(page_history[page_history.length-2-current_page_history_depth]);
    await GM.setValue("page-history-depth", current_page_history_depth+1);
  })();
}

function el(tag, inner_html, class_name) {
  e = document.createElement(tag);
  if(inner_html) {
    e.innerHTML = inner_html;
  }
  if(class_name) {
    e.className = class_name;
   }
  return e;
}

function rghv_button(label, click_cb) {
  var b = createElementFromHTML(`
    <button class="rgv-btn rgv-btn-primary rgv-btn-sm rghv-button"><i class="rgv-icon rgv-icon-arrow-left"></i>`+label+`</button>
  `);
  b.addEventListener("click", function(e) {
    click_cb();
  });
  return b;
}

function next_article_control(label) {
  return rghv_button(label, function(e) { navigate_to_random_github_repo(); });
}

function display_history() {
  (async () => {
    modal = createElementFromHTML(`
      <div class="rgv-modal rgv-modal-lg rgv-active rghv-modal-popup" id="rghv-history">
        <a href="#close" class="rgv-modal-overlay" aria-label="Close"></a>
        <div class="rgv-modal-container">
          <div class="rgv-modal-header">
            <a href="#close" class="rgv-btn rgv-btn-clear rgv-float-right" aria-label="Close"></a>
            <div class="rgv-modal-title h5">Explore+ History</div>
          </div>
          <div class="modal-body">
            <div class="content"></div>
          </div>
          <div class="modal-footer"></div>
        </div>
      </div>
    `);
    c = modal.children[1].children[1].children[0];
    history_list = createElementFromHTML(`<ul class="rgv-menu rghv-history-list"></ul>`);
    var page_history = await GM.getValue("page-history", []);
    page_history.forEach(function(page) {
      history_list.appendChild(createElementFromHTML(`
        <li class="menu-item">
          <a href="`+page+`">
            <i class="icon icon-link"></i>`+page+`
          </a>
        </li>
      `));
    });
    page_history_max = await GM.getValue("page-history-max");
    history_size_input = el('input', undefined, 'rghv-history-size-input');
    history_size_input.value = page_history_max;
    history_size_input.addEventListener('focus', function(e) {
      document.querySelector('.rghv-history-size-input').style.background = '';
    });
    save = rghv_button('save', function(e) {
      (async () => {
        var input_value = parseInt(document.querySelector('.rghv-history-size-input').value);
        if(!input_value) {
          document.querySelector('.rghv-history-size-input').style.background = 'red';
        }

        await GM.setValue("page-history-max", input_value);
      })();
    });
    close = rghv_button('close', function(e) {
      document.querySelector('#rghv-history').style.display = "none";
    });
    c.appendChild(el('span', 'Maximum items to store'));
    c.appendChild(history_size_input);
    c.appendChild(save);
    c.appendChild(close);
    c.appendChild(history_list);
    if(document.querySelector('#rghv-history')) {
      document.querySelector('#rghv-history').style.display = "flex";
    }
    else {
      document.body.appendChild(modal);
      modal.children[0].onclick = function(e) {
        document.querySelector('#rghv-history').style.display = "none";
      }
    }
  })();

}

function rghv_modal_footer() {
  var modal_footer = createElementFromHTML(`
    <div class="rgv-modal-footer">
    </div>
  `);
  var github_link = el('a', 'Project Source');
  github_link.href = 'https://github.com/joeystevens00/Github-Explore-Plus';
  var attribution = el("span", "", "rghv-attribution");
  attribution.appendChild(github_link);
  modal_footer.appendChild(attribution);
  return modal_footer;
}

function rghv_modal_content(topics) {
  var modal_content = createElementFromHTML(`<div class="rgv-modal-container"></div>`);
  modal_content.appendChild(rghv_modal_header());
  modal_content.appendChild(rghv_modal_body(topics));
  modal_content.appendChild(rghv_modal_footer());
  return modal_content;
}

function createElementFromHTML(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes
  return div.firstChild;
}

async function display_menu() {
  TOPICS = await load_topics_for_valid_session();
  // avoid opening multiple times
  if (document.querySelector('#rghv-modal') && document.querySelector('#rghv-modal').style.display === "flex") {return}
  style = style_sheet();
  document.head.appendChild(style);
  var modal = createElementFromHTML(`
    <div class="rgv-modal rgv-active" id="rghv-modal">
      <a href="#close" class="rgv-modal-overlay" aria-label="Close"></a>
    </div>
  `);
  modal.appendChild(rghv_modal_content(TOPICS));
  document.body.appendChild(modal);
  modal.style.display="flex";
  modal.children[0].onclick = function(e) {
    modal.parentNode.removeChild(modal);
  }
  // When the user clicks anywhere outside of the modal
  // window.onclick = function(event) {
  //   if (event.target == modal) {
  //     modal.parentNode.removeChild(modal);
  //   }
  // }
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
      navigate_to_last_page();
       // left arrow
    }
    else if (e.keyCode == '39') {
       // right arrow
      navigate_to_random_github_repo();
    }

    //escape
    else if (e.keyCode == '27') {
      hide_element('#rghv-modal');
      hide_element('#rghv-history');
    }
}

function hide_element(selector) {
  if (document.querySelector(selector) && document.querySelector(selector).style.display !== "none") {
    document.querySelector(selector).style.display = "none";
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
  menu.appendChild(next_article_control("Next Repo(→)"));
  menu.appendChild(next_article_control("Last Repo(←)"));
  menu.appendChild(rghv_button("Access Menu(↑)", function(e) { display_menu(); })); // clicking should appear to do nothing
  menu.appendChild(rghv_button("See Topics(↓)", function(e) { display_topics_as_notification(); }));
  menu.appendChild(rghv_button("History", function(e) { display_history(); })); // clicking should appear to do nothing
  // menu.addEventListener("click", function(e) {
  //   display_menu();
  // });
  document.head.appendChild(style_sheet());
  //document.head.appendChild(createElementFromHTML('<link rel="stylesheet" href="https://unpkg.com/spectre.css/dist/spectre.min.css">'))
  (async () => { insert_css(await get_url(ENDPOINT+'/static/spectre.min.css')); })();
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
      text: "(←Back)(↓Topics)(↑Menu)(Next→)",
      title: "Github Explore+",
      ondone: function() {
        console.log("notified controls.");
      }
    });
  }
})();

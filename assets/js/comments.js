const list = document.getElementById("comments-list");
const form = document.querySelector('.comments__form');
const authMenu = document.querySelector(".auth");
const submitButton = document.querySelector(".comments__form-submit");
const logoutButton = document.querySelector(".user__logout-button");
const threads = new Map();
const url = "{{ .url }}";
const production = '{{ hugo.IsProduction }}'
const isTr = '{{ .page.Language.Lang }}' == 'tr';
const plural = isTr ? '' : 's';
var numOfComments;
var formClone;
var lastReplyEl;

function dateNowDiff(date) {
  const elapsed = Math.abs(new Date() - date);
  const diffSeconds = Math.floor(elapsed / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffMonths / 12);
  let ago = `${plural} {{T "ago"}}`;
  const last = '{{ T "last" | strings.FirstUpper }}';
  let dateText;

  if (diffYears >= 1) {
    if (diffYears == 1)
      dateText = `${last} {{ T "year" }}`;
    else
      dateText = `${diffYears} {{ T "year" }}${ago}`;
  }
  else if (diffMonths >= 1) {
    if (diffMonths == 1)
      dateText = `${last} {{ T "month"  }}`;
    else
      dateText = `${diffMonths} {{ T "month" }}${ago}`;
  }
  else if (diffWeeks >= 1) {
    if (diffWeeks == 1)
      dateText = `${last} {{ T "week" }}`
    else
      dateText = `${diffWeeks} {{ T "week" }}${ago}`
  }
  else if (diffDays >= 1) {
    if (diffDays == 1)
      dateText = '{{ T "yesterday" | strings.FirstUpper}}';
    else
      dateText = `${diffDays} {{ T "day" }}${ago}`;
  }
  else if (diffHours >= 1) {
    if (diffHours == 1)
      ago = ' {{ T "ago" }}';
    dateText = `${diffHours} {{ T "hour" }}${ago}`;
  }
  else if (diffMinutes >= 1) {
    if (diffMinutes == 1)
      ago = ' {{ T "ago" }}';
    dateText = `${diffMinutes} {{ T "minute" }}${ago}`;
  }
  else {
    if (diffSeconds < 10)
      dateText = '{{ T "justNow" | strings.FirstUpper }}'
    else
      dateText = `${diffSeconds} {{ T "second" }}${ago}`
  }

  return dateText;

}
function initializeComment(comment) {
  const commentArticle = document.createElement("article");
  const commentInfo = document.createElement("div");
  const commentBody = document.createElement("div");
  const commentText = document.createElement("div");
  const commentActions = document.createElement("div");

  const commentAvatar = document.createElement("img");
  const commentAuthor = document.createElement("div");
  const commentDate = document.createElement("div");
  const replyButton = document.createElement("button");


  commentAuthor.className = 'comment__author';
  commentAuthor.innerText = comment.full_name;

  const replyText = '{{ T "reply" }}'
  replyButton.className = 'comment__reply';
  replyButton.addEventListener("click", handleReply);
  replyButton.title = replyText;
  replyButton.innerText = replyText;
  replyButton.type = 'button';

  commentInfo.className = 'comment__info'

  commentAvatar.className = 'avatar';
  commentAvatar.src = comment.avatar_url;
  commentAvatar.alt = 'Comment avatar';

  commentBody.className = 'comment__body';
  commentActions.className = 'comment__actions';
  commentText.className = 'comment__text';
  commentText.innerText = comment.body;

  commentDate.className = 'comment__date';
  const publishDate = new Date(comment.publish_date);
  commentDate.innerText = dateNowDiff(publishDate);

  commentArticle.id = `comment-${comment.id}`;
  commentArticle.className = 'comment';

  commentInfo.append(commentAvatar, commentAuthor, commentDate)
  commentActions.append(replyButton);

  commentBody.append(commentText, commentActions);
  commentArticle.append(commentInfo, commentBody);

  return commentArticle;
}
function createThread(comment, parentThread = list) {

  var thread = document.createElement("div");
  var threadCollapse = document.createElement("div")

  threadCollapse.className = "thread__collapse";
  // threadCollapse.title = "Collapse The Thread";
  // threadCollapse.role = "button";
  threadCollapse.tabIndex = -1;

  thread.appendChild(initializeComment(comment));
  thread.appendChild(threadCollapse);

  const isRoot = parentThread == list;

  thread.className = 'thread ' + (isRoot ? 'thread_root' : 'thread_indented');
  thread.role = 'listitem'
  const roleList = parentThread.role.split(' ');
  if (!roleList.includes('list'))
    parentThread.role += ' list';
  if (isRoot) {
    parentThread.prepend(thread)
  }
  else {
    parentThread.appendChild(thread);
  }
  return thread;
}
function updateHeading() {
  if (numOfComments > 0) {
    const heading = document.getElementById("comments-heading");
    const commentNumText = '{{ T "comment" }}' + (numOfComments > 1 ? plural : '');
    heading.innerText = `${numOfComments} ${commentNumText}`;
  }
}
function iterateComment(comment, localIteration = false) {

  const baseId = comment.base_id;
  let thread = null;
  if (!baseId) {

    thread = createThread(comment);
  } else {
    if (threads.size === 0)
      throw new Error("Something is wrong"); // This will also happen if the array is not sorted in ascending order


    let baseThread;
    if (!localIteration)
      baseThread = threads.get(baseId); // This doesn't work when iterating locally, idk wtf is going on
    else {
      baseThread = document.getElementById(`comment-${baseId}`).parentElement;
    }

    if (!baseThread) {
      // Base comment is deleted, where to go from here?
      // Maybe create a thread with body "deleted" just like in Reddit?
      console.log(`Could not find comment with id ${baseId}`)
      return
    }

    thread = createThread(comment, baseThread);
  };
  threads.set(comment.id, thread);
}
function updateAuthButtons(authButtons) {
  for (let i = 0; i < authButtons.length; i++) {
    const authButton = authButtons[i];
    authButton.addEventListener("click", (e) => {
      const client = authButton.dataset.provider;
      const width = 600;
      const height = 700;
      const left = (screen.width / 2) - (width / 1.5);
      const top = (screen.height / 2) - (height / 2.5);
      const windowFeatures = `width=${width},height=${height},left=${left},top=${top}`;
      const authWindow = window.open(`/auth/${client}/login`, client, windowFeatures);
    });
  }
}
async function loadComments() {

  const response = await fetch(url);

  if (!(response.ok)) {
    return;
  }

  const json = await response.json();
  numOfComments = json.length;
  for (let i = 0; i < numOfComments; i++) {

    iterateComment(json[i]);
  }
  updateHeading();
}
async function submitComment(e) {
  e.preventDefault();
  submitButton.disabled = true;
  const baseId = this.dataset.baseId ?? null;
  const body = this.body.value;
  const result = await fetch(url, {
    method: "POST",
    cache: "no-cache",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    referrerPolicy: "no-referrer",
    body: JSON.stringify({ body: body, baseId: baseId })
  });
  if (!result.ok)
    return;
  const id = await result.text();
  if (production == 'true') {

  }

  this.reset();
  submitButton.disabled = false;


  // iterate comment for user feedback

  const fullName = localStorage.getItem("name");
  const avatarUrl = localStorage.getItem("avatar");
  const publishDate = new Date().toISOString();
  const comment = { id: id, base_id: baseId, avatar_url: avatarUrl, full_name: fullName, body: body, publish_date: publishDate };

  iterateComment(comment, true);
  numOfComments++;
  updateHeading();
  if (baseId) {
    const cloneParent = formClone.parentElement;
    cloneParent.querySelector('.comment__reply').textContent = '{{ T "reply" }}';
    cloneParent.removeChild(formClone);
  }
}
async function logout(e) {
  e.preventDefault();

  const result = await fetch("/auth/logout", {
    method: "POST",
  });

  localStorage.removeItem("name"); // Maybe 400 days had passed and cookie is not available?
  localStorage.removeItem("avatar");

  if (!result.ok) {
    postError("Could not logout");
    return;
  }

  updateUserInfo();
}
function postError(str) {
  console.log(`%cERROR: ${str}`, 'color: red')
}
function updateFormClone() {

  const parent = formClone?.parentElement;
  parent?.removeChild(formClone);
  const baseId = formClone?.dataset.baseId;
  formClone = form.cloneNode(true);
  formClone.classList.add("comment__reply-form");
  formClone.addEventListener("submit", submitComment); // event listeners doesn't get cloned
  if (baseId)
    formClone.dataset.baseId = baseId;
  const cloneLogout = formClone.querySelector('.user__logout-button');
  cloneLogout.addEventListener("click", logout);
  parent?.appendChild(formClone);
  const authButtons = formClone.querySelectorAll('.auth__button')
  updateAuthButtons(authButtons);
}
function updateUserInfo() {
  const userInfo = document.querySelector(".user__info")
  const name = localStorage.getItem("name");
  const avatar = localStorage.getItem("avatar");
  const flag = !name || !avatar;
  if (flag) {
    userInfo.parentElement.classList.add("hide");
    authMenu.classList.remove("hide");
    submitButton.disabled = true;
  }
  else {
    userInfo.parentElement.classList.remove("hide");
    authMenu.classList.add("hide");
    const userChildren = userInfo.children;
    userChildren[0].firstElementChild.src = avatar;
    userChildren[1].innerText = name;
    submitButton.disabled = false;
  }
  updateFormClone();
  return flag;
}
function handleReply(e) {
  e.preventDefault();
  if (lastReplyEl)
    lastReplyEl.textContent = '{{ T "reply" }}';
  let comment = this.parentElement;
  while (!comment.classList.contains('comment'))
    comment = comment.parentElement;

  if (formClone.parentElement != comment) {
    comment.appendChild(formClone);
    const baseId = comment.id.substring(8); // 'comment-'
    console.log(baseId);
    formClone.dataset.baseId = baseId;
    this.textContent = '{{ T "cancel" }}';
    lastReplyEl = this;
  }
  else {
    comment.removeChild(formClone);
    this.textContent = '{{ T "reply" }}'
  }
  this.title = this.textContent;
}

const authChannel = new BroadcastChannel('auth');

authChannel.onmessage = (e) => {
  localStorage.setItem("name", e.data.name);
  localStorage.setItem("avatar", e.data.avatar);
  updateUserInfo();
}

updateUserInfo();
form.addEventListener("submit", submitComment);

logoutButton.addEventListener("click", logout);
updateAuthButtons(document.getElementsByClassName("auth__button"));

try {
  await loadComments();
}
catch (e) {
  postError(e.message)
}
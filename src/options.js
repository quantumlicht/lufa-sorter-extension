// Saves options to chrome.storage
function save_options() {
  var autoOrder = document.getElementById('auto-order').value
  chrome.storage.sync.set({
    autoOrder: autoOrder
  }, function() {
    // Update status to let user know options were loadd.
    var status = document.getElementById('status')
    status.textContent = 'Options saved.'
    setTimeout(function() {
      status.textContent = ''
    }, 750)
  })
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    autoOrder: false
  }, function(items) {
    document.getElementById('auto-order').value = items.autoOrder
  })
}

function build_menu(){
  let saveBtn = document.getElementById('save-btn')
  let trueOption = document.getElementById('true-option')
  let falseOption = document.getElementById('false-option')
  let optionTitle = document.getElementById('options-title')

  trueOption.innerHTML = chrome.i18n.getMessage('yes')
  falseOption.innerHTML = chrome.i18n.getMessage('no')
  optionTitle.innerHTML = chrome.i18n.getMessage('optionTitle')

  document.title = chrome.i18n.getMessage('pageTitle')

  saveBtn.innerHTML = chrome.i18n.getMessage('save')
  saveBtn.addEventListener('click', save_options)
  restore_options()
}

document.addEventListener('DOMContentLoaded', build_menu)

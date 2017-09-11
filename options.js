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
document.addEventListener('DOMContentLoaded', restore_options)
document.getElementById('save').addEventListener('click', save_options)

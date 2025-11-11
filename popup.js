(async () => {
  const result = await chrome.storage.local.get("popupAttemptCount");
  const value = result.popupAttemptCount || 0;
  const element = document.getElementById("block");
  element.textContent = value;

  let checked = await chrome.storage.local.get("checked");
  checked = checked.checked;
  const checkbox = document.getElementById("checkbox");

  if(checkbox.checked != checked){
    checkbox.click();
  }

  checkbox.addEventListener("change", () => {
    checked = checkbox.checked;
    chrome.storage.local.set({checked : checked});
  });
  const storage = await chrome.storage.local.get(null);
  console.log(chrome.storage.local);

})();

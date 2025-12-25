document.querySelectorAll("input[type='file']").forEach(input => {
  input.addEventListener("change", () => {
    const text = input.closest("form").querySelector(".file-name");

    if (input.files.length === 0) {
      text.textContent = "No file chosen";
    } else if (input.files.length === 1) {
      text.textContent = input.files[0].name;
    } else {
      text.textContent = `${input.files.length} files selected`;
    }
  });
});

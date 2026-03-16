document.querySelector("nav").addEventListener("click", function(e) {
  if (e.target === this) { this.classList.toggle("open"); }
});

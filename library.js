const libraryGrid = document.querySelector("#videoLibraryGrid");
const libraryCount = document.querySelector("#libraryCount");
const librarySearchInput = document.querySelector("#librarySearchInput");

function escapeLibraryHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function lessonSearchText(lesson) {
  return [
    lesson.title,
    lesson.description,
    lesson.language,
    lesson.level,
    `${lesson.segments?.length || 0} câu`
  ].join(" ").toLocaleLowerCase();
}

function renderLibrary(lessons) {
  libraryCount.textContent = `${lessons.length} video`;

  if (!lessons.length) {
    libraryGrid.innerHTML = `
      <div class="library-empty">
        Không tìm thấy video phù hợp.
      </div>
    `;
    return;
  }

  libraryGrid.innerHTML = lessons.map((lesson) => {
    const sentenceCount = Array.isArray(lesson.segments) ? lesson.segments.length : 0;
    const thumb = lesson.thumbnail
      ? `<img src="${escapeLibraryHtml(lesson.thumbnail)}" alt="${escapeLibraryHtml(lesson.title)}" loading="lazy" />`
      : `<div class="library-thumb-placeholder">🎬</div>`;

    return `
      <article class="video-library-card">
        <div class="library-thumb">
          ${thumb}
          <span class="library-badge">${escapeLibraryHtml(lesson.language || "Video")}</span>
        </div>
        <div class="library-card-body">
          <div>
            <h2>${escapeLibraryHtml(lesson.title)}</h2>
            <p>${escapeLibraryHtml(lesson.description || "Bài luyện chép chính tả có sẵn.")}</p>
          </div>
          <div class="library-meta">
            <span>${escapeLibraryHtml(lesson.level || "—")}</span>
            <span>${sentenceCount} câu</span>
          </div>
          <a class="btn btn-primary" href="index.html?lesson=${encodeURIComponent(lesson.id)}">
            Bắt đầu luyện →
          </a>
        </div>
      </article>
    `;
  }).join("");
}

function filterLibrary() {
  const keyword = librarySearchInput.value.trim().toLocaleLowerCase();
  if (!keyword) {
    renderLibrary(ADMIN_LESSONS);
    return;
  }

  const filtered = ADMIN_LESSONS.filter((lesson) => lessonSearchText(lesson).includes(keyword));
  renderLibrary(filtered);
}

librarySearchInput.addEventListener("input", filterLibrary);
renderLibrary(ADMIN_LESSONS);

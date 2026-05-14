const demoLesson = {
      title: "Demo Dictation Lesson",
      videoId: "dQw4w9WgXcQ",
      segments: [
        {
          start: 0.0,
          end: 4.5,
          text: "Never gonna give you up",
          difficulty: "Dễ"
        },
        {
          start: 4.6,
          end: 8.2,
          text: "Never gonna let you down",
          difficulty: "Dễ"
        },
        {
          start: 8.3,
          end: 12.2,
          text: "Never gonna run around and desert you",
          difficulty: "Trung bình"
        },
        {
          start: 12.3,
          end: 16.0,
          text: "Never gonna make you cry",
          difficulty: "Dễ"
        },
        {
          start: 16.1,
          end: 20.0,
          text: "Never gonna say goodbye",
          difficulty: "Dễ"
        }
      ]
    };

    const appState = {
      lesson: structuredClone(demoLesson),
      currentIndex: 0,
      completed: new Set(),
      submissions: 0,
      successfulSubmissions: 0,
      hintsUsed: 0,
      mistakes: JSON.parse(localStorage.getItem("dictationMistakes") || "[]"),
      manualWords: JSON.parse(localStorage.getItem("dictationManualWords") || "[]"),
      playbackRate: 1,
      startOffset: 0,
      endOffset: 0,
      caseSensitive: false,
      punctuationSensitive: false,
      reviewMode: false,
      reviewQueue: [],
      timer: null,
      playerReady: false,
      recorder: null,
      audioChunks: [],
      audioContext: null,
      analyser: null,
      animationId: null,
      mediaStream: null
    };

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    const els = {
      youtubeUrl: $("#youtubeUrl"),
      loadVideoBtn: $("#loadVideoBtn"),
      demoBtn: $("#demoBtn"),
      videoStatus: $("#videoStatus"),
      videoPlaceholder: $("#videoPlaceholder"),
      currentSegmentTitle: $("#currentSegmentTitle"),
      segmentTime: $("#segmentTime"),
      segmentWords: $("#segmentWords"),
      segmentDifficulty: $("#segmentDifficulty"),
      playSegmentBtn: $("#playSegmentBtn"),
      replaySegmentBtn: $("#replaySegmentBtn"),
      startOffset: $("#startOffset"),
      endOffset: $("#endOffset"),
      startOffsetValue: $("#startOffsetValue"),
      endOffsetValue: $("#endOffsetValue"),
      sentenceCounter: $("#sentenceCounter"),
      accuracyChip: $("#accuracyChip"),
      sentenceProgress: $("#sentenceProgress"),
      answerInput: $("#answerInput"),
      reviewLine: $("#reviewLine"),
      hintOutput: $("#hintOutput"),
      hintFirstBtn: $("#hintFirstBtn"),
      hintVowelsBtn: $("#hintVowelsBtn"),
      hintWordCountBtn: $("#hintWordCountBtn"),
      caseSensitiveToggle: $("#caseSensitiveToggle"),
      punctuationToggle: $("#punctuationToggle"),
      answerStatus: $("#answerStatus"),
      submitBtn: $("#submitBtn"),
      nextBtn: $("#nextBtn"),
      completedCount: $("#completedCount"),
      mistakeCount: $("#mistakeCount"),
      hintCount: $("#hintCount"),
      sessionAccuracy: $("#sessionAccuracy"),
      mistakeList: $("#mistakeList"),
      reviewMistakesBtn: $("#reviewMistakesBtn"),
      clearMistakesBtn: $("#clearMistakesBtn"),
      recordBtn: $("#recordBtn"),
      stopRecordBtn: $("#stopRecordBtn"),
      waveformCanvas: $("#waveformCanvas"),
      audioPlayback: $("#audioPlayback"),
      manualWordInput: $("#manualWordInput"),
      addManualWordBtn: $("#addManualWordBtn"),
      manualWordList: $("#manualWordList"),
      overallText: $("#overallText"),
      overallProgress: $("#overallProgress"),
      finishBtn: $("#finishBtn"),
      resetBtn: $("#resetBtn"),
      summaryDrawer: $("#summaryDrawer"),
      closeSummaryBtn: $("#closeSummaryBtn"),
      summaryCompleted: $("#summaryCompleted"),
      summaryAccuracy: $("#summaryAccuracy"),
      summaryHints: $("#summaryHints"),
      summaryMistakes: $("#summaryMistakes"),
      summaryAdvice: $("#summaryAdvice")
    };

    let player;

    function loadYouTubeApi() {
      if (window.YT && window.YT.Player) {
        createPlayer(appState.lesson.videoId);
        return;
      }

      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => createPlayer(appState.lesson.videoId);
    }

    function createPlayer(videoId) {
      if (player && typeof player.loadVideoById === "function") {
        player.loadVideoById(videoId);
        els.videoPlaceholder.classList.add("hidden");
        els.videoStatus.textContent = "Video đã tải";
        return;
      }

      player = new YT.Player("player", {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          controls: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin
        },
        events: {
          onReady: () => {
            appState.playerReady = true;
            els.videoPlaceholder.classList.add("hidden");
            els.videoStatus.textContent = "Sẵn sàng phát";
            setPlaybackRate(appState.playbackRate);
          },
          onError: () => {
            els.videoStatus.textContent = "Không thể nhúng video";
          }
        }
      });
    }

    function parseYouTubeId(input) {
      const value = input.trim();
      if (!value) return null;
      if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
      try {
        const url = new URL(value);
        if (url.hostname.includes("youtu.be")) {
          return url.pathname.slice(1).split(/[?&]/)[0];
        }
        if (url.hostname.includes("youtube.com")) {
          return url.searchParams.get("v") || url.pathname.split("/").pop();
        }
      } catch (error) {
        return null;
      }
      return null;
    }

    function getCurrentSegment() {
      const lessonSegments = appState.reviewMode ? appState.reviewQueue : appState.lesson.segments;
      return lessonSegments[appState.currentIndex];
    }

    function getActiveSegments() {
      return appState.reviewMode ? appState.reviewQueue : appState.lesson.segments;
    }

    function formatTime(seconds) {
      const safe = Math.max(0, seconds);
      const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
      const secs = (safe % 60).toFixed(1).padStart(4, "0");
      return `${minutes}:${secs}`;
    }

    function getWordTokens(text) {
      return text
        .normalize("NFC")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    }

    function stripPunctuation(text) {
      return text.replace(/[.,!?;:'"“”‘’()[\]{}…—-]/g, "");
    }

    function normalizeForCompare(text) {
      let normalized = text.normalize("NFC").trim().replace(/\s+/g, " ");
      if (!appState.caseSensitive) normalized = normalized.toLocaleLowerCase();
      if (!appState.punctuationSensitive) normalized = stripPunctuation(normalized);
      return normalized;
    }

    function updateSegmentUI() {
      const segment = getCurrentSegment();
      const segments = getActiveSegments();
      if (!segment) return;

      const current = appState.currentIndex + 1;
      const total = segments.length;
      const wordCount = getWordTokens(segment.text).length;
      const sentenceProgress = total ? (current / total) * 100 : 0;
      const overallCompleted = appState.completed.size;
      const overallTotal = appState.lesson.segments.length;
      const overallPercent = overallTotal ? (overallCompleted / overallTotal) * 100 : 0;

      els.currentSegmentTitle.textContent = `${appState.reviewMode ? "Câu ôn lại" : "Câu hiện tại"}: ${current} / ${total}`;
      els.segmentTime.textContent = `${formatTime(segment.start + appState.startOffset)} → ${formatTime(segment.end + appState.endOffset)}`;
      els.segmentWords.textContent = `${wordCount} từ`;
      els.segmentDifficulty.textContent = `Độ khó: ${segment.difficulty || "—"}`;
      els.sentenceCounter.textContent = `${appState.reviewMode ? "Ôn lại câu" : "Câu"} ${current} / ${total}`;
      els.sentenceProgress.style.width = `${sentenceProgress}%`;
      els.overallText.textContent = `${overallCompleted} / ${overallTotal} câu`;
      els.overallProgress.style.width = `${overallPercent}%`;
      els.nextBtn.disabled = true;
      els.recordBtn.disabled = true;
      els.answerInput.value = "";
      els.reviewLine.textContent = "Kết quả kiểm tra từng từ sẽ hiển thị tại đây.";
      els.hintOutput.textContent = "Chưa dùng gợi ý.";
      setAnswerStatus("⏳ Chưa nộp đáp án", "neutral");
      updateStats();
    }

    function playCurrentSegment() {
      const segment = getCurrentSegment();
      if (!segment) return;
      if (!appState.playerReady || !player) {
        setAnswerStatus("⚠ Video chưa sẵn sàng. Hãy tải video trước.", "error");
        return;
      }

      const start = Math.max(0, segment.start + appState.startOffset);
      const end = Math.max(start + 0.2, segment.end + appState.endOffset);
      player.seekTo(start, true);
      player.playVideo();
      watchSegmentEnd(end);
      els.videoStatus.textContent = "Đang phát câu";
    }

    function watchSegmentEnd(endTime) {
      window.clearInterval(appState.timer);
      appState.timer = window.setInterval(() => {
        if (!player || typeof player.getCurrentTime !== "function") return;
        const currentTime = player.getCurrentTime();
        if (currentTime >= endTime) {
          player.pauseVideo();
          window.clearInterval(appState.timer);
          els.videoStatus.textContent = "Đã tự dừng";
        }
      }, 90);
    }

    function setPlaybackRate(rate) {
      appState.playbackRate = Number(rate);
      if (player && typeof player.setPlaybackRate === "function") {
        player.setPlaybackRate(appState.playbackRate);
      }
      $$(".pill-btn").forEach((button) => {
        button.classList.toggle("active", Number(button.dataset.rate) === appState.playbackRate);
      });
    }

    function setAnswerStatus(message, type) {
      els.answerStatus.className = "status-pill";
      if (type === "success") els.answerStatus.classList.add("success");
      if (type === "error") els.answerStatus.classList.add("error");
      els.answerStatus.textContent = message;
    }

    function escapeHtml(text) {
      return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function compareAnswer() {
      const segment = getCurrentSegment();
      if (!segment) return;

      appState.submissions += 1;
      const typedRaw = els.answerInput.value.trim();
      const answerRaw = segment.text.trim();
      const typedNorm = normalizeForCompare(typedRaw);
      const answerNorm = normalizeForCompare(answerRaw);
      const isExact = typedNorm === answerNorm;

      renderWordReview(typedRaw, answerRaw);

      if (isExact) {
        appState.successfulSubmissions += 1;
        els.nextBtn.disabled = false;
        els.recordBtn.disabled = false;
        if (!appState.reviewMode) appState.completed.add(segment.text);
        setAnswerStatus("✅ Chính xác 100%. Bạn có thể chuyển câu tiếp theo.", "success");
      } else {
        const wrongTokens = collectWrongTokens(typedRaw, answerRaw);
        saveMistakes(wrongTokens, answerRaw);
        els.nextBtn.disabled = true;
        els.recordBtn.disabled = true;
        setAnswerStatus("❌ Chưa chính xác. Sửa phần màu đỏ trước khi đi tiếp.", "error");
      }

      updateStats();
    }

    function collectWrongTokens(typedRaw, answerRaw) {
      const typed = getWordTokens(normalizeForCompare(typedRaw));
      const answer = getWordTokens(normalizeForCompare(answerRaw));
      const wrong = [];
      const max = Math.max(typed.length, answer.length);
      for (let i = 0; i < max; i += 1) {
        const expected = answer[i];
        const actual = typed[i];
        if (expected !== actual) {
          wrong.push({ expected: expected || "∅", actual: actual || "∅" });
        }
      }
      return wrong;
    }

    function renderWordReview(typedRaw, answerRaw) {
      const typed = getWordTokens(typedRaw);
      const answer = getWordTokens(answerRaw);
      const max = Math.max(typed.length, answer.length);
      const html = [];

      for (let i = 0; i < max; i += 1) {
        const expected = answer[i];
        const actual = typed[i];
        if (expected && actual) {
          const same = normalizeForCompare(expected) === normalizeForCompare(actual);
          html.push(`<span class="${same ? "correct" : "wrong"}" title="Đáp án đúng: ${escapeHtml(expected)}">${escapeHtml(actual)}</span>`);
        } else if (expected && !actual) {
          html.push(`<span class="missing" title="Thiếu từ">${escapeHtml(expected)}</span>`);
        } else if (!expected && actual) {
          html.push(`<span class="extra" title="Từ thừa">${escapeHtml(actual)}</span>`);
        }
      }

      els.reviewLine.innerHTML = html.length ? html.join(" ") : "Bạn chưa nhập nội dung.";
    }

    function saveMistakes(wrongTokens, sentence) {
      wrongTokens.forEach((item) => {
        const key = `${item.expected}|${item.actual}`;
        const existing = appState.mistakes.find((mistake) => mistake.key === key);
        if (existing) {
          existing.count += 1;
          existing.sentence = sentence;
        } else {
          appState.mistakes.unshift({
            key,
            expected: item.expected,
            actual: item.actual,
            sentence,
            count: 1
          });
        }
      });
      appState.mistakes = appState.mistakes.slice(0, 24);
      localStorage.setItem("dictationMistakes", JSON.stringify(appState.mistakes));
      renderMistakes();
    }

    function renderMistakes() {
      if (!appState.mistakes.length) {
        els.mistakeList.innerHTML = `<div class="muted">Chưa có lỗi sai nào được lưu.</div>`;
        return;
      }

      els.mistakeList.innerHTML = appState.mistakes
        .map((mistake) => `
          <div class="list-item">
            <div>
              <strong>${escapeHtml(mistake.actual)} → ${escapeHtml(mistake.expected)}</strong>
              <small>${escapeHtml(mistake.sentence)}</small>
            </div>
            <span class="chip">×${mistake.count}</span>
          </div>
        `)
        .join("");
    }

    function useHint(type) {
      const segment = getCurrentSegment();
      if (!segment) return;
      const words = getWordTokens(segment.text);
      let result = "";

      if (type === "first") {
        result = words.map((word) => word[0] ? `${word[0]}…` : "…").join(" ");
      }

      if (type === "vowels") {
        result = words
          .map((word) => word.replace(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g, "•"))
          .join(" ");
      }

      if (type === "count") {
        result = `Câu này có ${words.length} từ.`;
      }

      appState.hintsUsed += 1;
      els.hintOutput.textContent = result;
      updateStats();
    }

    function goNext() {
      const segments = getActiveSegments();
      if (appState.currentIndex < segments.length - 1) {
        appState.currentIndex += 1;
        updateSegmentUI();
        return;
      }

      appState.reviewMode = false;
      appState.reviewQueue = [];
      appState.currentIndex = 0;
      showSummary();
      updateSegmentUI();
    }

    function updateStats() {
      const overallTotal = appState.lesson.segments.length;
      const completed = appState.completed.size;
      const accuracy = appState.submissions ? Math.round((appState.successfulSubmissions / appState.submissions) * 100) : 0;
      const sentencePercent = overallTotal ? Math.round((completed / overallTotal) * 100) : 0;

      els.completedCount.textContent = completed;
      els.mistakeCount.textContent = appState.mistakes.length;
      els.hintCount.textContent = appState.hintsUsed;
      els.sessionAccuracy.textContent = `${accuracy}%`;
      els.accuracyChip.textContent = `Độ chính xác: ${accuracy}%`;
      els.overallText.textContent = `${completed} / ${overallTotal} câu`;
      els.overallProgress.style.width = `${sentencePercent}%`;
    }

    function startMistakeReview() {
      if (!appState.mistakes.length) {
        setAnswerStatus("ℹ Chưa có lỗi sai để ôn lại.", "neutral");
        return;
      }

      const uniqueSentences = [...new Set(appState.mistakes.map((mistake) => mistake.sentence))];
      appState.reviewQueue = appState.lesson.segments.filter((segment) => uniqueSentences.includes(segment.text));
      if (!appState.reviewQueue.length) {
        setAnswerStatus("ℹ Chưa tạo được hàng đợi ôn tập.", "neutral");
        return;
      }
      appState.reviewMode = true;
      appState.currentIndex = 0;
      updateSegmentUI();
      setAnswerStatus("🔥 Đã bật chế độ thử thách lại các câu từng làm sai.", "neutral");
    }

    function clearMistakes() {
      appState.mistakes = [];
      localStorage.removeItem("dictationMistakes");
      renderMistakes();
      updateStats();
    }

    function addManualWord() {
      const value = els.manualWordInput.value.trim();
      if (!value) return;
      appState.manualWords.unshift({ word: value, addedAt: new Date().toISOString() });
      appState.manualWords = appState.manualWords.slice(0, 20);
      localStorage.setItem("dictationManualWords", JSON.stringify(appState.manualWords));
      els.manualWordInput.value = "";
      renderManualWords();
    }

    function renderManualWords() {
      if (!appState.manualWords.length) {
        els.manualWordList.innerHTML = `<div class="muted">Chưa đánh dấu từ mới.</div>`;
        return;
      }

      els.manualWordList.innerHTML = appState.manualWords
        .map((item) => `
          <div class="list-item">
            <div>
              <strong>${escapeHtml(item.word)}</strong>
              <small>Từ tự đánh dấu</small>
            </div>
          </div>
        `)
        .join("");
    }

    async function startRecording() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setAnswerStatus("⚠ Trình duyệt chưa hỗ trợ ghi âm trong ngữ cảnh này.", "error");
        return;
      }

      try {
        appState.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        appState.audioChunks = [];
        appState.recorder = new MediaRecorder(appState.mediaStream);
        appState.recorder.ondataavailable = (event) => {
          if (event.data.size > 0) appState.audioChunks.push(event.data);
        };
        appState.recorder.onstop = finalizeRecording;
        appState.recorder.start();
        connectWaveform(appState.mediaStream);
        els.recordBtn.disabled = true;
        els.stopRecordBtn.disabled = false;
        setAnswerStatus("🎙 Đang ghi âm shadowing...", "neutral");
      } catch (error) {
        setAnswerStatus("⚠ Không thể truy cập micro.", "error");
      }
    }

    function stopRecording() {
      if (appState.recorder && appState.recorder.state !== "inactive") {
        appState.recorder.stop();
      }
      els.stopRecordBtn.disabled = true;
      els.recordBtn.disabled = false;
      disconnectWaveform();
    }

    function finalizeRecording() {
      const blob = new Blob(appState.audioChunks, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(blob);
      els.audioPlayback.src = audioUrl;
      setAnswerStatus("✅ Đã lưu bản ghi âm shadowing để phát lại.", "success");
      if (appState.mediaStream) {
        appState.mediaStream.getTracks().forEach((track) => track.stop());
      }
    }

    function connectWaveform(stream) {
      appState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = appState.audioContext.createMediaStreamSource(stream);
      appState.analyser = appState.audioContext.createAnalyser();
      appState.analyser.fftSize = 2048;
      source.connect(appState.analyser);
      drawWaveform();
    }

    function disconnectWaveform() {
      cancelAnimationFrame(appState.animationId);
      if (appState.audioContext) appState.audioContext.close();
      appState.audioContext = null;
      appState.analyser = null;
    }

    function drawWaveform() {
      const canvas = els.waveformCanvas;
      const ctx = canvas.getContext("2d");
      const bufferLength = appState.analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);

      const render = () => {
        appState.animationId = requestAnimationFrame(render);
        appState.analyser.getByteTimeDomainData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i += 1) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = "rgba(167, 139, 250, 0.95)";
        ctx.lineWidth = 2;
        ctx.stroke();
      };
      render();
    }

    function showSummary() {
      const completed = appState.completed.size;
      const accuracy = appState.submissions ? Math.round((appState.successfulSubmissions / appState.submissions) * 100) : 0;
      els.summaryCompleted.textContent = completed;
      els.summaryAccuracy.textContent = `${accuracy}%`;
      els.summaryHints.textContent = appState.hintsUsed;
      els.summaryMistakes.textContent = appState.mistakes.length;
      if (completed === appState.lesson.segments.length && accuracy >= 90) {
        els.summaryAdvice.textContent = "Rất tốt. Bạn đã hoàn thành trọn bài với độ chính xác cao. Hãy bật chế độ ôn lỗi để củng cố các từ từng viết sai.";
      } else if (appState.mistakes.length > 0) {
        els.summaryAdvice.textContent = "Bạn đã có dữ liệu lỗi sai. Dùng nút “Thử thách lại” để luyện riêng các câu từng mắc lỗi.";
      } else {
        els.summaryAdvice.textContent = "Hãy hoàn thành thêm câu để báo cáo trở nên hữu ích hơn.";
      }
      els.summaryDrawer.classList.add("show");
    }

    function resetSession() {
      appState.currentIndex = 0;
      appState.completed = new Set();
      appState.submissions = 0;
      appState.successfulSubmissions = 0;
      appState.hintsUsed = 0;
      appState.reviewMode = false;
      appState.reviewQueue = [];
      appState.startOffset = 0;
      appState.endOffset = 0;
      els.startOffset.value = "0";
      els.endOffset.value = "0";
      els.startOffsetValue.textContent = "0.0s";
      els.endOffsetValue.textContent = "0.0s";
      els.summaryDrawer.classList.remove("show");
      updateSegmentUI();
    }

    function loadVideoFromInput() {
      const videoId = parseYouTubeId(els.youtubeUrl.value);
      if (!videoId) {
        setAnswerStatus("⚠ Link hoặc ID YouTube chưa hợp lệ.", "error");
        return;
      }
      appState.lesson.videoId = videoId;
      els.videoStatus.textContent = "Đang tải video";
      loadYouTubeApi();
    }

    function useDemoLesson() {
      appState.lesson = structuredClone(demoLesson);
      appState.reviewMode = false;
      appState.reviewQueue = [];
      appState.currentIndex = 0;
      els.youtubeUrl.value = `https://www.youtube.com/watch?v=${appState.lesson.videoId}`;
      loadYouTubeApi();
      updateSegmentUI();
      setAnswerStatus("✨ Đã nạp bài demo.", "neutral");
    }

    function setupEvents() {
      els.loadVideoBtn.addEventListener("click", loadVideoFromInput);
      els.demoBtn.addEventListener("click", useDemoLesson);
      els.playSegmentBtn.addEventListener("click", playCurrentSegment);
      els.replaySegmentBtn.addEventListener("click", playCurrentSegment);
      els.submitBtn.addEventListener("click", compareAnswer);
      els.nextBtn.addEventListener("click", goNext);
      els.hintFirstBtn.addEventListener("click", () => useHint("first"));
      els.hintVowelsBtn.addEventListener("click", () => useHint("vowels"));
      els.hintWordCountBtn.addEventListener("click", () => useHint("count"));
      els.reviewMistakesBtn.addEventListener("click", startMistakeReview);
      els.clearMistakesBtn.addEventListener("click", clearMistakes);
      els.addManualWordBtn.addEventListener("click", addManualWord);
      els.recordBtn.addEventListener("click", startRecording);
      els.stopRecordBtn.addEventListener("click", stopRecording);
      els.finishBtn.addEventListener("click", showSummary);
      els.resetBtn.addEventListener("click", resetSession);
      els.closeSummaryBtn.addEventListener("click", () => els.summaryDrawer.classList.remove("show"));

      els.manualWordInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") addManualWord();
      });

      els.answerInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          compareAnswer();
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Control" && !event.repeat) {
          playCurrentSegment();
        }
      });

      els.startOffset.addEventListener("input", (event) => {
        appState.startOffset = Number(event.target.value);
        els.startOffsetValue.textContent = `${appState.startOffset.toFixed(1)}s`;
        updateSegmentUI();
      });

      els.endOffset.addEventListener("input", (event) => {
        appState.endOffset = Number(event.target.value);
        els.endOffsetValue.textContent = `${appState.endOffset.toFixed(1)}s`;
        updateSegmentUI();
      });

      els.caseSensitiveToggle.addEventListener("change", (event) => {
        appState.caseSensitive = event.target.checked;
      });

      els.punctuationToggle.addEventListener("change", (event) => {
        appState.punctuationSensitive = event.target.checked;
      });

      $$(".pill-btn").forEach((button) => {
        button.addEventListener("click", () => setPlaybackRate(button.dataset.rate));
      });
    }

    function init() {
      renderMistakes();
      renderManualWords();
      setupEvents();
      useDemoLesson();
      updateStats();
    }

    init();

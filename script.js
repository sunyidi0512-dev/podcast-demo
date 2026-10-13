const card = document.querySelector('.podcast-card')
const screen = document.querySelector('.screen')
const listenButton = document.querySelector('#listenButton')
const miniPlayer = document.querySelector('#miniPlayer')
const miniToggle = document.querySelector('#miniToggle')
const radioStatus = document.querySelector('#radioStatus')
const playerDialog = document.querySelector('#playerDialog')
const dialogBackdrop = document.querySelector('#dialogBackdrop')
const sheetClose = document.querySelector('#sheetClose')
const sheetToggle = document.querySelector('#sheetToggle')
const sheetToggleGlyph = document.querySelector('#sheetToggleGlyph')
const sheetProgress = document.querySelector('#sheetProgress')
const sheetTime = document.querySelector('#sheetTime')
const sheetPrevious = document.querySelector('#sheetPrevious')
const sheetNext = document.querySelector('#sheetNext')
const compactRadioPill = document.querySelector('#compactRadioPill')

const EPISODE_DURATION = 506
const COMPACT_AFTER_MS = 10_000
let state = 'idle'
let loadingTimer = null
let progressFrame = null
let playStartedAt = 0
let elapsedSeconds = 0
let progressBaseSeconds = 0
let compactTimer = null
let pillTimer = null

function showState(nextState) {
  state = nextState
  card.classList.remove('state--idle', 'state--loading', 'state--playing', 'state--paused')
  card.classList.add(`state--${state}`)

  const labels = {
    idle: ['去听音', '可收听 Tiger AI Radio'],
    loading: ['取消生成', '正在生成 Tiger AI Radio'],
    playing: ['暂停播放', 'Tiger AI Radio 正在播放'],
    paused: ['继续播放', 'Tiger AI Radio 已暂停'],
  }
  const [label, status] = labels[state]
  listenButton.setAttribute('aria-label', label)
  listenButton.setAttribute('aria-pressed', String(state === 'playing'))
  miniToggle.setAttribute('aria-label', state === 'playing' ? '暂停播放' : '继续播放')
  miniToggle.querySelector('.sr-only').textContent = miniToggle.getAttribute('aria-label')
  sheetToggle.setAttribute('aria-label', state === 'playing' ? '暂停播放' : '继续播放')
  sheetToggleGlyph.textContent = state === 'playing' ? 'Ⅱ' : '▶'
  compactRadioPill.classList.toggle('is-playing', state === 'playing')
  compactRadioPill.setAttribute('aria-label', state === 'playing' ? '暂停播放' : '开始播放 Tiger AI Radio')
  radioStatus.textContent = status
  miniPlayer.classList.toggle('is-playing', state === 'playing')
}

function setProgress(seconds) {
  elapsedSeconds = Math.min(Math.max(seconds, 0), EPISODE_DURATION)
  const percentage = (elapsedSeconds / EPISODE_DURATION) * 100
  // The compact player ring advances at 2× speed while timing stays true to the episode.
  miniPlayer.style.setProperty('--progress', `${Math.max(Math.min(percentage * 2, 100), 1.6)}%`)
  sheetProgress.style.width = `${percentage}%`
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')
  const remainingSeconds = String(Math.floor(elapsedSeconds % 60)).padStart(2, '0')
  sheetTime.textContent = `${minutes}:${remainingSeconds} / 08:26`
}

function stopProgress() {
  if (progressFrame) window.cancelAnimationFrame(progressFrame)
  progressFrame = null
}

function updateProgress(now) {
  setProgress(progressBaseSeconds + (now - playStartedAt) / 1000)
  if (elapsedSeconds >= EPISODE_DURATION) {
    finishRadio()
    return
  }
  progressFrame = window.requestAnimationFrame(updateProgress)
}

function startProgress() {
  stopProgress()
  progressBaseSeconds = elapsedSeconds
  playStartedAt = performance.now()
  progressFrame = window.requestAnimationFrame(updateProgress)
}

function resetRadio() {
  window.clearTimeout(loadingTimer)
  window.clearTimeout(compactTimer)
  window.clearTimeout(pillTimer)
  stopProgress()
  setProgress(0)
  miniPlayer.classList.remove('is-visible')
  screen.classList.remove('is-compact', 'is-pill-visible')
  showState('idle')
}

function finishRadio() {
  setProgress(0)
  startProgress()
}

function startRadio() {
  window.clearTimeout(loadingTimer)
  window.clearTimeout(compactTimer)
  window.clearTimeout(pillTimer)
  screen.classList.remove('is-compact', 'is-pill-visible')
  miniPlayer.classList.remove('is-visible')
  showState('loading')
  loadingTimer = window.setTimeout(() => {
    miniPlayer.classList.add('is-visible')
    showState('playing')
    startProgress()
    scheduleCompact()
  }, 1100)
}

function pauseRadio() {
  window.clearTimeout(compactTimer)
  stopProgress()
  showState('paused')
}

function resumeRadio() {
  showState('playing')
  startProgress()
  if (screen.classList.contains('is-compact')) miniPlayer.classList.add('is-visible')
  scheduleCompact()
}

function toggleRadio() {
  if (state === 'idle') startRadio()
  else if (state === 'loading') resetRadio()
  else if (state === 'playing') pauseRadio()
  else resumeRadio()
}

function openPlayerDialog() {
  playerDialog.classList.add('is-open')
  playerDialog.setAttribute('aria-hidden', 'false')
}

function closePlayerDialog() {
  playerDialog.classList.remove('is-open')
  playerDialog.setAttribute('aria-hidden', 'true')
}

function playAdjacentEpisode() {
  setProgress(0)
  if (state !== 'playing') showState('playing')
  startProgress()
}

function toggleCompactRadio() {
  if (state === 'playing') {
    pauseRadio()
    return
  }

  window.clearTimeout(loadingTimer)
  screen.classList.add('is-compact')
  miniPlayer.classList.add('is-visible')
  if (state === 'idle' || state === 'loading') {
    showState('playing')
    startProgress()
  } else {
    resumeRadio()
  }
}

function collapsePodcastCard() {
  screen.classList.add('is-compact')
  miniPlayer.classList.toggle('is-visible', state === 'playing')
  window.clearTimeout(pillTimer)
  pillTimer = window.setTimeout(() => screen.classList.add('is-pill-visible'), 500)
}

function scheduleCompact() {
  window.clearTimeout(compactTimer)
  if (screen.classList.contains('is-compact')) return
  const remaining = Math.max(0, COMPACT_AFTER_MS - elapsedSeconds * 1000)
  compactTimer = window.setTimeout(collapsePodcastCard, remaining)
}

listenButton.addEventListener('click', toggleRadio)
miniToggle.addEventListener('click', openPlayerDialog)
sheetToggle.addEventListener('click', toggleRadio)
dialogBackdrop.addEventListener('click', closePlayerDialog)
sheetClose.addEventListener('click', closePlayerDialog)
sheetPrevious.addEventListener('click', playAdjacentEpisode)
sheetNext.addEventListener('click', playAdjacentEpisode)
compactRadioPill.addEventListener('click', toggleCompactRadio)

// Keep the player sheet open when the floating player is tapped.
let playerSheetOpenedAt = 0
miniToggle.addEventListener('click', () => { playerSheetOpenedAt = performance.now() }, true)
dialogBackdrop.addEventListener('click', event => {
  if (performance.now() - playerSheetOpenedAt < 650) event.stopImmediatePropagation()
}, true)

// Manual compact trigger: second Listen tap collapses the playing card.
listenButton.addEventListener('click', event => {
  if (state === 'playing') {
    event.stopImmediatePropagation()
    collapsePodcastCard()
  }
}, true)
// Cancel the legacy 10-second auto-collapse timer after playback starts.
listenButton.addEventListener('click', () => window.setTimeout(() => window.clearTimeout(compactTimer), 1200))

// Automatic compacting is disabled; compacting happens only on the second Listen tap.
scheduleCompact = () => {}

// Safety net: cancel any legacy compact timer; only the second Listen tap may compact.
window.setInterval(() => window.clearTimeout(compactTimer), 100)

// Replace the legacy Listen handler with the two-tap play / compact flow.
const manualListenButton = listenButton.cloneNode(true)
listenButton.replaceWith(manualListenButton)
manualListenButton.addEventListener('click', () => {
  if (state === 'idle') startRadio()
  else if (state === 'loading') resetRadio()
  else if (state === 'playing') collapsePodcastCard()
  else resumeRadio()
})

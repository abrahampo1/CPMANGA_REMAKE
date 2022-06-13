const { ipcRenderer } = require('electron')
const $ = require('jquery')
var search_query
function load(view) {
  $('#app').load('views/' + view + '.html')
}

function load_icons() {
  if (localStorage.getItem('loggedin')) {
    $('#loggedin').html('person')
  } else {
    $('#loggedin').html('person_off')
  }
}

load_icons()

ipcRenderer.on('kindle', (sender, kindle_path) => {
  document.getElementById('kindle').innerHTML = `usb`
  if (!kindle_path) {
    document.getElementById('kindle').innerHTML = 'usb_off'
  }
})

ipcRenderer.on('login', function (sender, logged) {
  if (logged == true) {
    localStorage.setItem('loggedin', true)
    load_icons()
    alert('User logged in successfully')
  } else {
    alert(logged)
  }
})

function login() {
  let user = document.getElementById('user').value
  let password = document.getElementById('password').value

  ipcRenderer.send('login', { user, password })
}



ipcRenderer.on('manga_query', function (sender, mangas) {
    mangas = JSON.parse(mangas)
  console.log(mangas)
  document.getElementById('mangas').innerHTML = ''
  let key = 0
  mangas.forEach((manga) => {
    document.getElementById(
      'mangas',
    ).innerHTML += `<a href="#" onclick="select_manga(${key})">
    <img src="${manga.cover.image256}">
    <p class="title">${manga.localizedTitle.en}</p>
    </a><br>`
    key++
  })
})

ipcRenderer.on('manga_data', function (sender, manga) {
  manga = JSON.parse(manga)
  console.log(manga)
  document.getElementById('manga_alt_title').innerHTML = ``
  Object.values(manga.localizedTitle).forEach((title) => {
    console.log(title)
    if (typeof title === 'string') {
      document.getElementById(
        'manga_alt_title',
      ).innerHTML += `<option value="${title}">${title}</option>`
    }
  })
  manga.localizedAltTitles.forEach((title) => {
    console.log(title)
    Object.values(title).forEach((alt) => {
      if (typeof alt === 'string') {
        document.getElementById(
          'manga_alt_title',
        ).innerHTML += `<option value="${alt}">${alt}</option>`
      }
    })
  })
  document.getElementById('manga_langs').innerHTML = ''
  manga.availableTranslatedLanguages.forEach((language) => {
    document.getElementById(
      'manga_langs',
    ).innerHTML += `<option value="${language}">${language}</option>`
  })
})

function select_manga(manga_id) {
  ipcRenderer.send('get_manga', manga_id)
}

function get_chapters() {
  let language = document.getElementById('manga_langs').value
  ipcRenderer.send('get_chapters', { language })
}

ipcRenderer.on('manga_chapters', function (sender, chapters) {
  chapters = JSON.parse(chapters)
  document.getElementById('manga_chapters').innerHTML = ''
  console.log(chapters)
  let key = 0
  chapters.forEach((chapter) => {
    document.getElementById(
      'manga_chapters',
    ).innerHTML += `<a href="#" onclick="download_chapter(${key})">#${chapter.chapter} - ${chapter.title}</a><br>`
    key++
  })
})

function download_chapter(chapter) {
  let alt = document.getElementById('manga_alt_title').value
  ipcRenderer.send('download_chapter', { chapter, alt })
}
ipcRenderer.on('download_chapter_started', () => {
  alert('Download started successfully')
})
ipcRenderer.on('downloaded_chapter', (sender, data) => {
  alert('download completed successfully')
})

ipcRenderer.on('alert', (sender, data) => {
  alert(data)
})


function search() {
    $('#search').show()
    $('#search').css('display', 'fixed')
    $('#search input').focus()
}

function search_manga(query) {
    $('#search').hide()
    load('manga_list')
    ipcRenderer.send('search_manga', query)
    search_query = query
}

$('#search').hide()

function reloadStylesheets() {
    var queryString = '?reload=' + new Date().getTime();
    $('link[rel="stylesheet"]').each(function () {
        this.href = this.href.replace(/\?.*|$/, queryString);
    });
}
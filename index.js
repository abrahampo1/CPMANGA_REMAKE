const { app, BrowserWindow, ipcMain } = require('electron')
var usbDetect = require('usb-detection')
const MFA = require('mangadex-full-api')
const os = require('os')
const path = require('path')
const fs = require('fs')
var kindle_path
const Axios = require('axios')
const exec = require('child_process')

var win

const drivelist = require('electron-drivelist')

const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  })

  win.loadFile('web/index.html')
}

app.whenReady().then(() => {
  createWindow()
})

function detect_kindle() {
  drivelist.list().then((r) => {
    kindle_path = ''
    r.forEach((drive) => {
      if (drive.description == 'Kindle Internal Storage USB Device') {
        console.log('Kindle on ' + drive.mountpoints[0].path)
        kindle_path = drive.mountpoints[0].path
        return drive.mountpoints[0].path
      }
    })
    if (kindle_path) {
      win.send('kindle', kindle_path)
    } else {
      win.send('kindle', false)
    }
  })
}

usbDetect.startMonitoring()

// Detect add/insert
usbDetect.on('add', function (device) {
  console.log('add', device)
  setTimeout(() => {
    detect_kindle()
  }, 1000)
})

// Detect remove
usbDetect.on('remove', function (device) {
  detect_kindle()
})

// Get a list of USB devices on your system, optionally filtered by `vid` or `pid`

// Promise version of `find`:
ipcMain.on('load', () => {
  usbDetect
    .find(6473)
    .then(function () {
      detect_kindle()
    })
    .catch(function (err) {
      console.log(err)
    })
})

async function download_chapter(manga, chapter, alt_title) {
  win.send('download_chapter_started')
  let pages = await chapter.getReadablePages()
  folder('./manga/' + manga.id + '/' + chapter.id)

  let i = 0
  let downloaded = 0
  pages.forEach((page_url) => {
    const file_name = 'manga/' + manga.id + '/' + chapter.id + '/' + i + '.png'
    downloadImage(page_url, file_name).then(() => {
      downloaded++
      if (downloaded >= pages.length) {
        console.log('All downloaded')
        win.send('alert', 'All chapters downloaded')
        let kcc = exec.exec(
          '"mobi/kcc-c2e" -p KPW ./manga/' +
            manga.id +
            '/' +
            chapter.id +
            ' -t "' +
            alt_title +
            ` ${chapter.chapter}"`,
        )
        kcc.stdout.on('data', function (data) {
          console.log(data.toString())
          win.send('alert', data.toString())
        })
        // what to do with data coming from the standard error
        kcc.stderr.on('data', function (data) {
          console.log(data.toString())
          win.send('alert', data.toString())
        })
        // what to do when the command is done
        kcc.on('exit', function (code) {
          console.log('program ended with code: ' + code)
          folder(path.join(kindle_path, '/documents/cpmanga/' + manga.title))
          fs.copyFile(
            path.join(
              __dirname,
              '/manga/' + manga.id + '/' + chapter.id + '.mobi',
            ),
            path.join(
              kindle_path,
              '/documents/cpmanga/' + manga.title + `/${chapter.chapter}.mobi`,
            ),
            (r) => {
              win.send('alert', 'Passed to kindle successfully')
              fs.rm(
                path.join(__dirname, '/manga/' + manga.id + '/' + chapter.id),
                { recursive: true, force: true },
                () => {
                  win.send('downloaded_chapter')
                },
              )
            },
          )
        })
      }
    })

    i++
  })
}

ipcMain.on('login', function (e, data) {
  let user = data.user
  let pass = data.password
  MFA.login(user, pass, './bin/.md_cache')
    .then(function () {
      win.send('login', true)
    })
    .catch((err) => {
      win.send('login', err)
    })
})
var mangas
var selecter_manga
ipcMain.on('search_manga', async (sender, data) => {
  console.log('searching ' + data)
  let manga = await MFA.Manga.search(data)
  let key = 0
  let filled = 0;
  manga.forEach((element) => {
    let k = key
    element.mainCover.resolve().then((r) => {
      manga[k].cover = r
      filled++
      if (filled >= manga.length) {
        win.send('manga_query', JSON.stringify(manga))
      }
    })
    key++
  })

  mangas = manga
})
var chapters
ipcMain.on('get_manga', async (sender, data) => {
  console.log('searching ' + data)
  selecter_manga = mangas[data]
  selecter_manga.covers = await selecter_manga.getCovers()
  win.send('manga_data', JSON.stringify(selecter_manga))
})

ipcMain.on('get_chapters', async (sender, data) => {
  let chapter = await selecter_manga.getFeed(
    {
      translatedLanguage: [data.language],
      order: { chapter: 'asc' },
      limit: 99999,
    },
    true,
  )
  chapters = chapter
  win.send('manga_chapters', JSON.stringify(chapter))
})

ipcMain.on('download_chapter', async function (sender, chapter_id) {
  let chapter = chapters[chapter_id.chapter]
  download_chapter(selecter_manga, chapter, chapter_id.alt)
})

function folder(folderName) {
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName, { recursive: true })
  }
}

async function downloadImage(url, filepath) {
  const response = await Axios({
    url,
    method: 'GET',
    responseType: 'stream',
  })
  return new Promise((resolve, reject) => {
    response.data
      .pipe(fs.createWriteStream(filepath))
      .on('error', reject)
      .once('close', () => resolve(filepath))
  })
}
